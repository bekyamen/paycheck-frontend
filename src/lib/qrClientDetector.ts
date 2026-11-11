export interface ClientQrScanResult {
  kind: "CBE" | "TELEBIRR" | "QR" | "PDF" | "NONE";
  caption: string;
  rawValue: string | null;
}

type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }
) => { data: string } | null;

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

let jsQrLoadPromise: Promise<JsQrFn | null> | null = null;

function getWindowJsQr(): JsQrFn | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { jsQR?: JsQrFn }).jsQR;
  return typeof fn === "function" ? fn : null;
}

function loadJsQr(): Promise<JsQrFn | null> {
  const existing = getWindowJsQr();
  if (existing) return Promise.resolve(existing);
  if (typeof document === "undefined") return Promise.resolve(null);
  if (jsQrLoadPromise) return jsQrLoadPromise;

  jsQrLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "/vendor/jsQR.js";
    script.async = true;
    script.onload = () => resolve(getWindowJsQr());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return jsQrLoadPromise;
}

function classifyQrPayload(raw: string): ClientQrScanResult {
  const trimmed = raw.trim();
  if (/cbe\.com\.et|apps\.cbe|mbreceipt|\bFT[A-Z0-9]{8,16}\b/i.test(trimmed)) {
    return {
      kind: "CBE",
      caption: "CBE QR detected — reference will be taken from QR.",
      rawValue: trimmed,
    };
  }
  if (/ethiotelecom\.et|transactioninfo|telebirr/i.test(trimmed)) {
    return {
      kind: "TELEBIRR",
      caption: "Telebirr QR detected — reference will be taken from QR.",
      rawValue: trimmed,
    };
  }
  return {
    kind: "QR",
    caption: "QR code detected — reference will be taken from QR.",
    rawValue: trimmed,
  };
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function scanCanvasRegion(
  jsQR: JsQrFn,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  maxSide = 1000
): string | null {
  const scale = Math.min(1, maxSide / Math.max(sw, sh, 1));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dw, dh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  const imgData = ctx.getImageData(0, 0, dw, dh);
  const hit = jsQR(imgData.data, dw, dh, { inversionAttempts: "attemptBoth" });
  return hit?.data?.trim() || null;
}

export async function detectQrInReceiptFile(
  file: File,
  objectUrl?: string
): Promise<ClientQrScanResult> {
  if (file.type === "application/pdf") {
    return {
      kind: "PDF",
      caption: "PDF receipt selected — tap Verify to check payment.",
      rawValue: null,
    };
  }

  const ownedUrl = objectUrl ? null : URL.createObjectURL(file);
  const src = objectUrl || ownedUrl!;
  try {
    const img = await loadImageElement(src);
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      return {
        kind: "NONE",
        caption: "Receipt selected — tap Verify to scan and check payment.",
        rawValue: null,
      };
    }

    // 1. Native BarcodeDetector when supported
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (Detector) {
      try {
        const supported =
          typeof Detector.getSupportedFormats === "function"
            ? await Detector.getSupportedFormats()
            : ["qr_code"];
        if (supported.includes("qr_code")) {
          const detector = new Detector({ formats: ["qr_code"] });
          const results = await detector.detect(img);
          const raw = results?.[0]?.rawValue?.trim();
          if (raw) return classifyQrPayload(raw);
        }
      } catch {
        // Fall through to jsQR
      }
    }

    // 2. Fallback to jsQR (full image, then lower receipt crop for tall screenshots)
    const jsQR = await loadJsQr();
    if (jsQR) {
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const fullHit = scanCanvasRegion(jsQR, img, 0, 0, natW, natH, 1000);
      if (fullHit) return classifyQrPayload(fullHit);

      if (natH > 700) {
        const cropY = Math.floor(natH * 0.25);
        const cropH = Math.max(1, natH - cropY);
        const lowerHit = scanCanvasRegion(jsQR, img, 0, cropY, natW, cropH, 1000);
        if (lowerHit) return classifyQrPayload(lowerHit);
      }
    }

    return {
      kind: "NONE",
      caption: "Receipt selected — tap Verify to scan and check payment.",
      rawValue: null,
    };
  } finally {
    if (ownedUrl) URL.revokeObjectURL(ownedUrl);
  }
}
