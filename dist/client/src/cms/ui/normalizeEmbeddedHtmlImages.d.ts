import type { CmsImageUploadSource } from "./CmsAdminUiConfig.js";
type UploadContext = {
    source: CmsImageUploadSource;
};
export type NormalizeEmbeddedHtmlImagesOptions = {
    html: string;
    maxImageBytes?: number;
    uploadImage: (file: File, context: UploadContext) => Promise<string | null | undefined>;
};
export declare const hasEmbeddedBase64Image: (html: string | undefined | null) => boolean;
export declare const normalizeEmbeddedHtmlImages: (options: NormalizeEmbeddedHtmlImagesOptions) => Promise<string>;
export {};
//# sourceMappingURL=normalizeEmbeddedHtmlImages.d.ts.map