import type { Response } from "express";
export declare const isDangerousInlineMimeType: (contentType?: string | null) => boolean;
export declare const buildAttachmentContentDisposition: (filename: string) => string;
export declare const applyFmContentHeaders: (input: {
    res: Response;
    cacheControl: string;
    contentType?: string;
    sha256?: string | null;
    filename: string;
    download?: boolean;
}) => void;
//# sourceMappingURL=contentHeaders.d.ts.map