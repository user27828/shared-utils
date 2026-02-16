/**
 * Image Variant Generation — shared-utils/client/fm/utils
 *
 * Client-side image resizing for generating variant thumbnails/previews.
 * Uses OffscreenCanvas (with Web Worker when available) for performance.
 * Falls back to main-thread processing when workers aren't supported.
 *
 * Ported from db-supabase/client/fm/utils/imageVariants.ts — no external
 * dependencies, works with any FM backend.
 */

/** Default set of target widths (px) for responsive image variants. */
export const DEFAULT_VARIANT_WIDTHS = [320, 640, 960, 1280, 1920] as const;

/** Maximum canvas dimension (width or height) supported by most browsers. */
export const MAX_CANVAS_DIMENSION = 4096;

/** Returns `true` if the environment supports `OffscreenCanvas.convertToBlob()`. */
export const supportsOffscreenCanvas = (): boolean => {
  return (
    typeof OffscreenCanvas !== "undefined" &&
    typeof (OffscreenCanvas as any).prototype?.convertToBlob === "function"
  );
};

/**
 * Constrain dimensions so neither side exceeds {@link MAX_CANVAS_DIMENSION}.
 * Preserves aspect ratio when scaling down.
 */
export const constrainToCanvasLimits = (
  width: number,
  height: number,
): { width: number; height: number; wasConstrained: boolean } => {
  const maxDim = Math.max(width, height);
  if (maxDim <= MAX_CANVAS_DIMENSION) {
    return { width, height, wasConstrained: false };
  }

  const scale = MAX_CANVAS_DIMENSION / maxDim;
  return {
    width: Math.floor(width * scale),
    height: Math.floor(height * scale),
    wasConstrained: true,
  };
};

/** A single resized image variant blob with its dimensions and MIME type. */
export interface ImageVariantResult {
  targetWidth: number;
  targetHeight: number;
  mimeType: string;
  blob: Blob;
}

/** Complete result from {@link generateImageVariants}, including source metadata. */
export interface GenerateImageVariantsResult {
  sourceWidth: number;
  sourceHeight: number;
  constrainedWidth: number;
  constrainedHeight: number;
  wasConstrained: boolean;
  variants: ImageVariantResult[];
}

const canUseWorker = (): boolean => {
  return typeof Worker !== "undefined";
};

const chooseTargetWidths = (input: {
  widths: readonly number[];
  sourceWidth: number;
}): number[] => {
  const out = input.widths
    .map((w) => Math.floor(w))
    .filter((w) => Number.isFinite(w) && w > 0 && w <= input.sourceWidth);

  // Never upscale. Ensure at least one variant (at original width) if source is tiny.
  if (out.length === 0) {
    return [Math.max(1, Math.floor(input.sourceWidth))];
  }

  // De-dupe and sort.
  return Array.from(new Set(out)).sort((a, b) => a - b);
};

const tryEncodeType = async (input: {
  canvas: OffscreenCanvas;
  preferWebp: boolean;
  quality: number;
}): Promise<{ blob: Blob; mimeType: string }> => {
  const q = Math.min(1, Math.max(0.1, input.quality));

  if (input.preferWebp) {
    try {
      const b = await input.canvas.convertToBlob({
        type: "image/webp",
        quality: q,
      });
      if (b && b.size > 0) {
        return { blob: b, mimeType: "image/webp" };
      }
    } catch {
      // ignore — fall through to JPEG
    }
  }

  const jpeg = await input.canvas.convertToBlob({
    type: "image/jpeg",
    quality: q,
  });
  return { blob: jpeg, mimeType: "image/jpeg" };
};

/**
 * Generate responsive image variants from a source file.
 *
 * @param input.file      Source image (File or Blob)
 * @param input.widths    Target widths (default: 320, 640, 960, 1280, 1920)
 * @param input.preferWebp  Prefer WebP encoding (default: true)
 * @param input.quality   Encoding quality 0–1 (default: 0.82)
 * @param input.useWorker  Use Web Worker when available (default: true)
 */
export const generateImageVariants = async (input: {
  file: File | Blob;
  widths?: readonly number[];
  preferWebp?: boolean;
  quality?: number;
  useWorker?: boolean;
}): Promise<GenerateImageVariantsResult> => {
  const widths = input.widths || DEFAULT_VARIANT_WIDTHS;
  const preferWebp = input.preferWebp !== false;
  const quality = typeof input.quality === "number" ? input.quality : 0.82;
  const useWorker = input.useWorker !== false;

  // ── Worker path ──────────────────────────────────────────────────────
  if (useWorker && canUseWorker() && supportsOffscreenCanvas()) {
    try {
      const worker = new Worker(
        new URL("../workers/imageVariantWorker.ts", import.meta.url),
        { type: "module" },
      );

      const result = await new Promise<GenerateImageVariantsResult>(
        (resolve, reject) => {
          const timeout = window.setTimeout(() => {
            reject(new Error("Image worker timed out"));
          }, 30_000);

          worker.onmessage = (ev: MessageEvent) => {
            const data = ev.data as any;
            window.clearTimeout(timeout);
            if (!data || !data.ok) {
              reject(new Error(data?.error || "Worker failed"));
              return;
            }
            resolve(data.result as GenerateImageVariantsResult);
          };

          worker.onerror = () => {
            window.clearTimeout(timeout);
            reject(new Error("Worker error"));
          };

          worker.postMessage({
            blob: input.file,
            widths: Array.from(widths),
            maxCanvasDimension: MAX_CANVAS_DIMENSION,
            preferWebp,
            quality,
          });
        },
      );

      worker.terminate();
      return result;
    } catch {
      // Fall through to main-thread path.
    }
  }

  // ── Main-thread fallback ─────────────────────────────────────────────
  const anyWindow = window as any;
  if (typeof anyWindow.createImageBitmap !== "function") {
    throw new Error("createImageBitmap not supported");
  }

  const bitmap: ImageBitmap = await anyWindow.createImageBitmap(input.file, {
    imageOrientation: "from-image",
  });

  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const constrained = constrainToCanvasLimits(sourceWidth, sourceHeight);
  const targetWidths = chooseTargetWidths({
    widths,
    sourceWidth: constrained.width,
  });

  if (constrained.wasConstrained) {
    // eslint-disable-next-line no-console
    console.warn(
      "Image exceeded canvas limits; constrained before variant generation",
      {
        sourceWidth,
        sourceHeight,
        constrainedWidth: constrained.width,
        constrainedHeight: constrained.height,
      },
    );
  }

  // If we had to constrain, redraw to a safe-sized bitmap first.
  let baseBitmap: ImageBitmap = bitmap;
  if (constrained.wasConstrained) {
    const oc = new OffscreenCanvas(constrained.width, constrained.height);
    const ctx = oc.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to get canvas context");
    }
    ctx.drawImage(bitmap, 0, 0, constrained.width, constrained.height);
    baseBitmap = oc.transferToImageBitmap();
    bitmap.close();
  }

  const variants: ImageVariantResult[] = [];
  for (const w of targetWidths) {
    const h = Math.max(
      1,
      Math.round((baseBitmap.height * w) / baseBitmap.width),
    );

    const oc = new OffscreenCanvas(w, h);
    const ctx = oc.getContext("2d");
    if (!ctx) {
      continue;
    }

    ctx.drawImage(baseBitmap, 0, 0, w, h);

    const encoded = await tryEncodeType({ canvas: oc, preferWebp, quality });
    variants.push({
      targetWidth: w,
      targetHeight: h,
      mimeType: encoded.mimeType,
      blob: encoded.blob,
    });
  }

  baseBitmap.close();

  return {
    sourceWidth,
    sourceHeight,
    constrainedWidth: constrained.width,
    constrainedHeight: constrained.height,
    wasConstrained: constrained.wasConstrained,
    variants,
  };
};
