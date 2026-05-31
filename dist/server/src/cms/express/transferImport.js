import { canonicalizeSlug } from "../../../../utils/src/cms/validation.js";
const toSlugSet = (slugs) => {
    return new Set(Array.from(slugs)
        .map((value) => canonicalizeSlug(value || ""))
        .filter(Boolean));
};
export const suggestUniqueTransferSlug = (args) => {
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
export const findTransferEntryConflict = (args) => {
    const normalizedSlug = canonicalizeSlug(args.pkg.cmsEntry.slug || "");
    const existingEntry = args.existingEntries.find((entry) => {
        return (canonicalizeSlug(entry.slug || "") === normalizedSlug &&
            String(entry.post_type || "") === args.pkg.postType &&
            String(entry.locale || "") === args.pkg.locale);
    });
    if (!existingEntry) {
        return null;
    }
    const existingSlugs = args.existingEntries
        .filter((entry) => {
        return (String(entry.post_type || "") === args.pkg.postType &&
            String(entry.locale || "") === args.pkg.locale);
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
export const createTransferAssetConflict = (args) => {
    const sameContent = Boolean(args.existingSha256 && args.existingSha256 === args.asset.sha256);
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
export const getDefaultTransferAssetResolutionMode = (conflict) => {
    if (conflict.sameContent) {
        return "reuse_existing_asset";
    }
    if (conflict.blocking) {
        return null;
    }
    return conflict.allowedResolutions[0] || null;
};
export const describeTransferAssetConflict = (conflict) => {
    const target = `${conflict.targetFolderPath}/${conflict.targetFileName}`;
    if (conflict.sameContent) {
        return `Destination already has ${target} with matching bytes. You can safely reuse the existing file or upload the packaged copy again.`;
    }
    return `Destination already has ${target} but the existing file hash differs. Choose whether to keep the packaged filename or create a renamed upload.`;
};
export const validateCreateCopySlug = (args) => {
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
export const buildTransferPackageSummary = (pkg) => {
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
export const buildTransferInspectResult = (args) => {
    return {
        packageSummary: buildTransferPackageSummary(args.pkg),
        entryConflict: args.entryConflict || null,
        assetConflicts: args.assetConflicts || [],
        validationErrors: args.validationErrors || [],
        warnings: args.warnings || [],
    };
};
//# sourceMappingURL=transferImport.js.map