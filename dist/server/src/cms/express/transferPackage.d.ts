import type { CmsContentType, CmsHeadRow } from "../../../../utils/src/cms/types.js";
export declare const CMS_TRANSFER_SCHEMA_VERSION = "1.0";
export type CmsTransferAssetRole = "body_content_reference" | "featured_image" | "og_image" | "attachment";
export interface CmsTransferReferenceLocation {
    kind: CmsTransferAssetRole;
    path: string;
    originalValue?: string | null;
}
export interface CmsTransferPackagedAsset {
    assetId: string;
    role: CmsTransferAssetRole;
    targetFolderPath: string;
    targetFileName: string;
    mimeType: string;
    byteLength: number;
    sha256: string;
    bytesBase64: string;
    referenceLocations: CmsTransferReferenceLocation[];
    sourceFileUid?: string | null;
}
export interface CmsTransferPortableEntry {
    title: string;
    slug: string;
    contentType: CmsContentType;
    content: string;
    tags: string[];
    options: unknown;
    metadata: unknown;
    publishedAt?: string | null;
    updatedAt?: string | null;
}
export interface CmsTransferPackage {
    schemaVersion: string;
    exportedAt: string;
    sourceEnvironment: string | null;
    sourceCmsUid: string;
    postType: string;
    locale: string;
    cmsEntry: CmsTransferPortableEntry;
    assets: CmsTransferPackagedAsset[];
    hostExtensions: Record<string, unknown>;
    warnings: string[];
}
export declare const buildCmsTransferAssetTargetFolderPath: (input: {
    bucket: string;
    objectKey: string;
}) => string;
export declare const parseCmsTransferAssetTargetFolderPath: (value: string) => {
    bucket: string;
    folderPath: string;
};
export declare const buildCmsTransferPortableEntry: (row: CmsHeadRow) => CmsTransferPortableEntry;
export declare const buildCmsTransferPackage: (args: {
    row: CmsHeadRow;
    assets?: CmsTransferPackagedAsset[];
    hostExtensions?: Record<string, unknown>;
    warnings?: string[];
    sourceEnvironment?: string | null;
    exportedAt?: string;
}) => CmsTransferPackage;
export declare const parseCmsTransferPackage: (value: string | unknown) => CmsTransferPackage;
export declare const stringifyCmsTransferPackage: (value: CmsTransferPackage, indentation?: number) => string;
export declare const buildCmsTransferFilename: (value: CmsTransferPackage) => string;
//# sourceMappingURL=transferPackage.d.ts.map