export type EmailAttachmentContentEncoding = "utf8" | "base64";
export interface EmailAttachmentLike {
    content: Buffer | string;
    contentEncoding?: EmailAttachmentContentEncoding;
    contentType?: string;
}
export declare const getAttachmentContentBuffer: (attachment: EmailAttachmentLike) => Buffer;
export declare const getAttachmentContentBase64: (attachment: EmailAttachmentLike) => string;
export declare const getAttachmentContentType: (attachment: EmailAttachmentLike) => string | undefined;
export declare const getAttachmentByteLength: (attachment: EmailAttachmentLike) => number;
//# sourceMappingURL=attachments.d.ts.map