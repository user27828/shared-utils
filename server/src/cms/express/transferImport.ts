import type { CmsHeadRow } from "../../../../utils/src/cms/types.js";
import { canonicalizeSlug } from "../../../../utils/src/cms/validation.js";

import type {
  CmsTransferPackage,
  CmsTransferPackagedAsset,
} from "./transferPackage.js";

export type CmsTransferEntryResolutionMode =
  | "update_existing"
  | "create_copy";

export type CmsTransferAssetResolutionMode =
  | "reuse_existing_asset"
  | "upload_packaged_asset"
  | "rename_upload";

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

const toSlugSet = (slugs: Iterable<string>): Set<string> => {
  return new Set(
    Array.from(slugs)
      .map((value) => canonicalizeSlug(value || ""))
      .filter(Boolean),
  );
};

export const suggestUniqueTransferSlug = (args: {
  baseSlug: string;
  existingSlugs: Iterable<string>;
  maxAttempts?: number;
}): string | null => {
  const baseSlug = canonicalizeSlug(args.baseSlug || "");
  if (!baseSlug) {
    return null;
  }

  const existingSlugs = toSlugSet(args.existingSlugs);
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  const maxAttempts = args.maxAttempts || 100;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = canonicalizeSlug(`${baseSlug}-copy-${attempt}`);
    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const findTransferEntryConflict = (args: {
  pkg: CmsTransferPackage;
  existingEntries: CmsHeadRow[];
}): CmsTransferEntryConflict | null => {
  const normalizedSlug = canonicalizeSlug(args.pkg.cmsEntry.slug || "");
  const existingEntry = args.existingEntries.find((entry) => {
    return (
      canonicalizeSlug(entry.slug || "") === normalizedSlug &&
      String(entry.post_type || "") === args.pkg.postType &&
      String(entry.locale || "") === args.pkg.locale
    );
  });

  if (!existingEntry) {
    return null;
  }

  const existingSlugs = args.existingEntries
    .filter((entry) => {
      return (
        String(entry.post_type || "") === args.pkg.postType &&
        String(entry.locale || "") === args.pkg.locale
      );
    })
    .map((entry) => String(entry.slug || ""));

  return {
    kind: "entry_slug_conflict",
    existingUid: existingEntry.uid,
    existingSlug: canonicalizeSlug(existingEntry.slug || ""),
    allowedResolutions: ["update_existing", "create_copy"],
    suggestedCopySlug: suggestUniqueTransferSlug({
      baseSlug: normalizedSlug,
      existingSlugs,
    }),
  };
};

export const createTransferAssetConflict = (args: {
  asset: CmsTransferPackagedAsset;
  existingFileUid?: string | null;
  existingSha256?: string | null;
}): CmsTransferAssetConflict => {
  const sameContent = Boolean(
    args.existingSha256 && args.existingSha256 === args.asset.sha256,
  );

  return {
    kind: "asset_target_conflict",
    assetId: args.asset.assetId,
    targetFolderPath: args.asset.targetFolderPath,
    targetFileName: args.asset.targetFileName,
    existingFileUid: args.existingFileUid || null,
    existingSha256: args.existingSha256 || null,
    sameContent,
    blocking: !sameContent,
    allowedResolutions: sameContent
      ? ["reuse_existing_asset", "upload_packaged_asset"]
      : ["rename_upload", "upload_packaged_asset"],
  };
};

export const getDefaultTransferAssetResolutionMode = (
  conflict: CmsTransferAssetConflict,
): CmsTransferAssetResolutionMode | null => {
  if (conflict.sameContent) {
    return "reuse_existing_asset";
  }

  if (conflict.blocking) {
    return null;
  }

  return conflict.allowedResolutions[0] || null;
};

export const describeTransferAssetConflict = (
  conflict: CmsTransferAssetConflict,
): string => {
  const target = `${conflict.targetFolderPath}/${conflict.targetFileName}`;

  if (conflict.sameContent) {
    return `Destination already has ${target} with matching bytes. You can safely reuse the existing file or upload the packaged copy again.`;
  }

  return `Destination already has ${target} but the existing file hash differs. Choose whether to keep the packaged filename or create a renamed upload.`;
};

export const validateCreateCopySlug = (args: {
  slug: string;
  existingSlugs: Iterable<string>;
}): string => {
  const slug = canonicalizeSlug(args.slug || "");
  if (!slug) {
    throw new Error("A non-empty slug is required for create_copy resolution.");
  }

  const existingSlugs = toSlugSet(args.existingSlugs);
  if (existingSlugs.has(slug)) {
    throw new Error(`Slug \`${slug}\` is already in use.`);
  }

  return slug;
};

export const buildTransferPackageSummary = (
  pkg: CmsTransferPackage,
): CmsTransferPackageSummary => {
  return {
    schemaVersion: pkg.schemaVersion,
    sourceCmsUid: pkg.sourceCmsUid,
    postType: pkg.postType,
    locale: pkg.locale,
    slug: canonicalizeSlug(pkg.cmsEntry.slug || ""),
    assetCount: pkg.assets.length,
    warningCount: pkg.warnings.length,
  };
};

export const buildTransferInspectResult = (args: {
  pkg: CmsTransferPackage;
  entryConflict?: CmsTransferEntryConflict | null;
  assetConflicts?: CmsTransferAssetConflict[];
  validationErrors?: string[];
  warnings?: string[];
}): CmsTransferInspectResult => {
  return {
    packageSummary: buildTransferPackageSummary(args.pkg),
    entryConflict: args.entryConflict || null,
    assetConflicts: args.assetConflicts || [],
    validationErrors: args.validationErrors || [],
    warnings: args.warnings || [],
  };
};
