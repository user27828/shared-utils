import type { CmsHeadRow } from "../../../../utils/src/cms/types.js";
import type { CmsTransferPackage, CmsTransferPackagedAsset } from "./transferPackage.js";
export type CmsTransferEntryResolutionMode = "update_existing" | "create_copy";
export type CmsTransferAssetResolutionMode = "reuse_existing_asset" | "upload_packaged_asset" | "rename_upload";
export interface CmsTransferEntryConflict {
    kind: "entry_slug_conflict";
    existingUid: string;
    existingSlug: string;
    allowedResolutions: CmsTransferEntryResolutionMode[];
    suggestedCopySlug: string | null;
}
export interface CmsTransferAssetConflict {
    kind: "asset_target_conflict";
    assetId: string;
    targetFolderPath: string;
    targetFileName: string;
    existingFileUid?: string | null;
    existingSha256?: string | null;
    sameContent: boolean;
    blocking: boolean;
    allowedResolutions: CmsTransferAssetResolutionMode[];
}
export interface CmsTransferPackageSummary {
    schemaVersion: string;
    sourceCmsUid: string;
    postType: string;
    locale: string;
    slug: string;
    assetCount: number;
    warningCount: number;
}
export interface CmsTransferInspectResult {
    packageSummary: CmsTransferPackageSummary;
    entryConflict: CmsTransferEntryConflict | null;
    assetConflicts: CmsTransferAssetConflict[];
    validationErrors: string[];
    warnings: string[];
}
export declare const suggestUniqueTransferSlug: (args: {
    baseSlug: string;
    existingSlugs: Iterable<string>;
    maxAttempts?: number;
}) => string | null;
export declare const findTransferEntryConflict: (args: {
    pkg: CmsTransferPackage;
    existingEntries: CmsHeadRow[];
}) => CmsTransferEntryConflict | null;
export declare const createTransferAssetConflict: (args: {
    asset: CmsTransferPackagedAsset;
    existingFileUid?: string | null;
    existingSha256?: string | null;
}) => CmsTransferAssetConflict;
export declare const getDefaultTransferAssetResolutionMode: (conflict: CmsTransferAssetConflict) => CmsTransferAssetResolutionMode | null;
export declare const describeTransferAssetConflict: (conflict: CmsTransferAssetConflict) => string;
export declare const validateCreateCopySlug: (args: {
    slug: string;
    existingSlugs: Iterable<string>;
}) => string;
export declare const buildTransferPackageSummary: (pkg: CmsTransferPackage) => CmsTransferPackageSummary;
export declare const buildTransferInspectResult: (args: {
    pkg: CmsTransferPackage;
    entryConflict?: CmsTransferEntryConflict | null;
    assetConflicts?: CmsTransferAssetConflict[];
    validationErrors?: string[];
    warnings?: string[];
}) => CmsTransferInspectResult;
//# sourceMappingURL=transferImport.d.ts.map