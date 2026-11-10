/**
 * imageCompressor.ts
 *
 * Client-side receipt image cropper & compressor using HTML5 Canvas.
 * Keeps receipts up to ~1400px wide at JPEG 0.85 for sharp OCR/QR reading
 * and fast uploads on mobile data, with iOS/Android safe fallbacks.
 */

export interface CompressOptions {
  maxDimension?: number;
  maxHeight?: number;
  quality?: number;
  fileName?: string;
}

export interface FrameCropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

function dataUrlToJpegBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(",");
    const byteStr = atob(parts[1] || "");
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) {
      ia[i] = byteStr.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === "function") {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) return resolve(blob);
            resolve(dataUrlToJpegBlob(canvas.toDataURL("image/jpeg", quality)));
          },
          "image/jpeg",
          quality
        );
        return;
      } catch {
        // Fallback to toDataURL below
      }
    }
    resolve(dataUrlToJpegBlob(canvas.toDataURL("image/jpeg", quality)));
  });
}

/**
 * Maps a screen-space guide frame element onto raw <video> pixel coordinates,
 * accurately compensating for `object-fit: cover` scaling and mirrored front cameras.
 */
export function computeVideoFrameCrop(
  video: HTMLVideoElement,
  frameEl: HTMLElement | null,
  bleedRatio = 0.02,
  mirrored = false
): FrameCropRect | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const vRect = video.getBoundingClientRect();
  const fRect = frameEl ? frameEl.getBoundingClientRect() : null;
  if (!fRect || fRect.width <= 0 || fRect.height <= 0 || vRect.width <= 0 || vRect.height <= 0) {
    return { sx: 0, sy: 0, sw: vw, sh: vh };
  }

  const scale = Math.max(vRect.width / vw, vRect.height / vh);
  const renderedW = vw * scale;
  const renderedH = vh * scale;
  const offsetX = (vRect.width - renderedW) / 2;
  const offsetY = (vRect.height - renderedH) / 2;

  const fx = fRect.left - vRect.left;
  const fy = fRect.top - vRect.top;

  let sx = (fx - offsetX) / scale;
  let sy = (fy - offsetY) / scale;
  let sw = fRect.width / scale;
  let sh = fRect.height / scale;

  if (mirrored) {
    sx = vw - (sx + sw);
  }

  if (bleedRatio > 0) {
    const padX = sw * bleedRatio;
    const padY = sh * bleedRatio;
    sx -= padX;
    sy -= padY;
    sw += padX * 2;
    sh += padY * 2;
  }

  sx = Math.max(0, Math.min(vw - 1, sx));
  sy = Math.max(0, Math.min(vh - 1, sy));
  sw = Math.max(1, Math.min(vw - sx, sw));
  sh = Math.max(1, Math.min(vh - sy, sh));

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.round(sw),
    sh: Math.round(sh),
  };
}

/**
 * Single-pass video frame capture → crop to guide frame → resize (~1400px wide) → JPEG 0.85 File.
 */
export async function cropAndCompressVideoFrame(
  video: HTMLVideoElement,
  frameEl: HTMLElement | null,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; mirrored?: boolean } = {}
): Promise<File | null> {
  const maxWidth = options.maxWidth ?? 1400;
  const maxHeight = options.maxHeight ?? 1960;
  const quality = options.quality ?? 0.85;

  const crop = computeVideoFrameCrop(video, frameEl, 0.02, Boolean(options.mirrored));
  if (!crop) return null;

  let targetW = crop.sw;
  let targetH = crop.sh;
  if (targetW > maxWidth) {
    targetH = Math.round((targetH * maxWidth) / targetW);
    targetW = maxWidth;
  }
  if (targetH > maxHeight) {
    targetW = Math.round((targetW * maxHeight) / targetH);
    targetH = maxHeight;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, targetW);
  canvas.height = Math.max(1, targetH);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToJpegBlob(canvas, quality);
  canvas.width = 0;
  canvas.height = 0;

  if (!blob) return null;
  return new File([blob], `receipt_live_${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function compressReceiptImage(
  source: File | Blob,
  options: CompressOptions = {}
): Promise<File> {
  const maxWidth = options.maxDimension ?? 1400;
  const maxHeight = options.maxHeight ?? 1960;
  const quality = options.quality ?? 0.85;
  const defaultName = `receipt_${Date.now()}.jpg`;
  const fileName =
    options.fileName ||
    (source instanceof File ? source.name.replace(/\.[^/.]+$/, ".jpg") : defaultName);

  // Do not run canvas compression on non-image files (e.g. PDF receipts)
  if (source.type === "application/pdf") {
    return source instanceof File
      ? source
      : new File([source], fileName.endsWith(".pdf") ? fileName : "receipt.pdf", { type: source.type });
  }

  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.document) {
      if (source instanceof File) return resolve(source);
      return resolve(new File([source], fileName, { type: "image/jpeg" }));
    }

    const objectUrl = URL.createObjectURL(source);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        if (source instanceof File) return resolve(source);
        return resolve(new File([source], fileName, { type: "image/jpeg" }));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToJpegBlob(canvas, quality);
      canvas.width = 0;
      canvas.height = 0;

      if (!blob) {
        if (source instanceof File) return resolve(source);
        return resolve(new File([source], fileName, { type: "image/jpeg" }));
      }

      resolve(
        new File([blob], fileName.replace(/\.[^/.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        })
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      if (source instanceof File) return resolve(source);
      return resolve(new File([source], fileName, { type: "image/jpeg" }));
    };

    img.src = objectUrl;
  });
}
