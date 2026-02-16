/**
 * Image Variant Web Worker — shared-utils/client/fm/workers
 *
 * Runs image resizing off the main thread using OffscreenCanvas.
 * Receives a Blob + target widths, returns an array of resized Blobs.
 *
 * Ported from db-supabase/client/fm/workers/imageVariantWorker.ts.
 */
import {
  constrainToCanvasLimits,
  type GenerateImageVariantsResult,
  MAX_CANVAS_DIMENSION,
} from "../utils/imageVariants.js";

type WorkerRequest = {
  blob: Blob;
  widths: number[];
  maxCanvasDimension?: number;
  preferWebp?: boolean;
  quality?: number;
};

const chooseTargetWidths = (input: {
  widths: number[];
  sourceWidth: number;
}): number[] => {
  const out = (input.widths || [])
    .map((w) => Math.floor(w))
    .filter((w) => Number.isFinite(w) && w > 0 && w <= input.sourceWidth);

  if (out.length === 0) {
    return [Math.max(1, Math.floor(input.sourceWidth))];
  }

  return Array.from(new Set(out)).sort((a, b) => a - b);
};

const tryEncode = async (input: {
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

self.onmessage = (ev: MessageEvent) => {
  (async () => {
    const req = ev.data as WorkerRequest;
    const maxCanvasDim = Math.max(
      1,
      Math.min(8192, Math.floor(req.maxCanvasDimension || MAX_CANVAS_DIMENSION)),
    );
    const preferWebp = req.preferWebp !== false;
    const quality = typeof req.quality === "number" ? req.quality : 0.82;

    if (typeof (self as any).createImageBitmap !== "function") {
      (self as any).postMessage({
        ok: false,
        error: "createImageBitmap not supported",
      });
      return;
    }

    const bitmap: ImageBitmap = await (self as any).createImageBitmap(
      req.blob,
      { imageOrientation: "from-image" },
    );

    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;

    // Constrain to canvas limits (use local max if overridden).
    const constrained = (() => {
      const maxDim = Math.max(sourceWidth, sourceHeight);
      if (maxDim <= maxCanvasDim) {
        return {
          width: sourceWidth,
          height: sourceHeight,
          wasConstrained: false,
        };
      }
      const scale = maxCanvasDim / maxDim;
      return {
        width: Math.floor(sourceWidth * scale),
        height: Math.floor(sourceHeight * scale),
        wasConstrained: true,
      };
    })();

    const targetWidths = chooseTargetWidths({
      widths: req.widths,
      sourceWidth: constrained.width,
    });

    // If constrained, redraw to a safe size first.
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

    const variants: GenerateImageVariantsResult["variants"] = [];
    for (const w of targetWidths) {
      const h = Math.max(
        1,
        Math.round((baseBitmap.height * w) / baseBitmap.width),
      );
      if (Math.max(w, h) > maxCanvasDim) {
        continue;
      }
      const oc = new OffscreenCanvas(w, h);
      const ctx = oc.getContext("2d");
      if (!ctx) {
        continue;
      }
      ctx.drawImage(baseBitmap, 0, 0, w, h);
      const encoded = await tryEncode({ canvas: oc, preferWebp, quality });
      variants.push({
        targetWidth: w,
        targetHeight: h,
        mimeType: encoded.mimeType,
        blob: encoded.blob,
      });
    }

    baseBitmap.close();

    const result: GenerateImageVariantsResult = {
      sourceWidth,
      sourceHeight,
      constrainedWidth: constrained.width,
      constrainedHeight: constrained.height,
      wasConstrained: constrained.wasConstrained,
      variants,
    };

    (self as any).postMessage({ ok: true, result });
  })().catch((err) => {
    (self as any).postMessage({
      ok: false,
      error: err?.message || "Worker failed",
    });
  });
};
