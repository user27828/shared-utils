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
export declare const DEFAULT_VARIANT_WIDTHS: readonly [320, 640, 960, 1280, 1920];
/** Maximum canvas dimension (width or height) supported by most browsers. */
export declare const MAX_CANVAS_DIMENSION = 4096;
/** Returns `true` if the environment supports `OffscreenCanvas.convertToBlob()`. */
export declare const supportsOffscreenCanvas: () => boolean;
/**
 * Constrain dimensions so neither side exceeds {@link MAX_CANVAS_DIMENSION}.
 * Preserves aspect ratio when scaling down.
 */
export declare const constrainToCanvasLimits: (width: number, height: number) => {
    width: number;
    height: number;
    wasConstrained: boolean;
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
/**
 * Generate responsive image variants from a source file.
 *
 * @param input.file      Source image (File or Blob)
 * @param input.widths    Target widths (default: 320, 640, 960, 1280, 1920)
 * @param input.preferWebp  Prefer WebP encoding (default: true)
 * @param input.quality   Encoding quality 0–1 (default: 0.82)
 * @param input.useWorker  Use Web Worker when available (default: true)
 */
export declare const generateImageVariants: (input: {
    file: File | Blob;
    widths?: readonly number[];
    preferWebp?: boolean;
    quality?: number;
    useWorker?: boolean;
}) => Promise<GenerateImageVariantsResult>;
//# sourceMappingURL=imageVariants.d.ts.map