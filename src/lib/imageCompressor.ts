/**
 * imageCompressor.ts
 *
 * Client-side receipt image compression using HTML5 Canvas.
 * Resizes images to max 1280px and compresses to ~82% JPEG quality.
 * Reduces 5-10MB phone camera photos down to ~150-280KB for instant
 * upload over slow mobile connections while preserving full OCR and
 * QR code legibility.
 */

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  fileName?: string;
}

export async function compressReceiptImage(
  source: File | Blob,
  options: CompressOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? 1280;
  const quality = options.quality ?? 0.82;
  const defaultName = `receipt_${Date.now()}.jpg`;
  const fileName = options.fileName || (source instanceof File ? source.name.replace(/\.[^/.]+$/, ".jpg") : defaultName);

  return new Promise((resolve) => {
    // If not running in browser, return fallback file
    if (typeof window === "undefined" || !window.document) {
      if (source instanceof File) return resolve(source);
      return resolve(new File([source], fileName, { type: "image/jpeg" }));
    }

    const objectUrl = URL.createObjectURL(source);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Downscale if either dimension exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Draw onto offscreen canvas
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback if 2D context unavailable
        if (source instanceof File) return resolve(source);
        return resolve(new File([source], fileName, { type: "image/jpeg" }));
      }

      // High-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            if (source instanceof File) return resolve(source);
            return resolve(new File([source], fileName, { type: "image/jpeg" }));
          }
          const compressedFile = new File([blob], fileName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
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
