export type WysiwygEditorKind = "tinymce" | "ckeditor" | "easymde";
export type WysiwygAssetKind = "file" | "image" | "media";
export type WysiwygPickRequest = {
    value: string;
    kind: WysiwygAssetKind;
};
export type WysiwygPickResult = {
    url: string;
    title?: string;
    text?: string;
    alt?: string;
    kind?: WysiwygAssetKind;
    /** MIME type of the picked asset (e.g. "video/mp4", "image/png"). */
    mimeType?: string;
};
export type WysiwygProgressFn = (percent: number) => void;
export type WysiwygImageUploadRequest = {
    file?: File;
    blob?: Blob;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    progress?: WysiwygProgressFn;
};
export type WysiwygImageUploadResult = {
    url: string;
};
export declare const normalizeCssSize: (value: string | number | undefined) => string | undefined;
export declare const pickLocalFile: (options: {
    accept?: string;
}) => Promise<File | null>;
//# sourceMappingURL=wysiwyg-common.d.ts.map