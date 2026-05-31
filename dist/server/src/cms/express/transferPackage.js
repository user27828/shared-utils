import { canonicalizeSlug, normalizeLocale, } from "../../../../utils/src/cms/validation.js";
export const CMS_TRANSFER_SCHEMA_VERSION = "1.0";
const isRecord = (value) => {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
};
const trimToNull = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};
const toStringArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => trimToNull(entry))
        .filter((entry) => Boolean(entry));
};
const normalizeTransferAssetPathSegments = (value) => {
    return String(value || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((segment) => segment.trim())
        .filter((segment) => Boolean(segment) && segment !== "." && segment !== "..");
};
export const buildCmsTransferAssetTargetFolderPath = (input) => {
    const bucket = trimToNull(input.bucket);
    if (!bucket) {
        throw new Error("Transfer asset bucket is required.");
    }
    const objectKeySegments = normalizeTransferAssetPathSegments(input.objectKey);
    const folderSegments = objectKeySegments.slice(0, -1);
    return [bucket, ...folderSegments].join("/");
};
export const parseCmsTransferAssetTargetFolderPath = (value) => {
    const segments = normalizeTransferAssetPathSegments(value);
    if (segments.length === 0) {
        throw new Error("Transfer asset targetFolderPath must include a destination bucket.");
    }
    const [bucket, ...folderSegments] = segments;
    return {
        bucket,
        folderPath: folderSegments.join("/"),
    };
};
const normalizePortableEntry = (value) => {
    if (!isRecord(value)) {
        throw new Error("Transfer package cmsEntry must be an object.");
    }
    const title = trimToNull(value.title);
    const slug = trimToNull(canonicalizeSlug(typeof value.slug === "string" ? value.slug : ""));
    const contentType = trimToNull(value.contentType);
    if (!title) {
        throw new Error("Transfer package cmsEntry.title is required.");
    }
    if (!slug) {
        throw new Error("Transfer package cmsEntry.slug is required.");
    }
    if (!contentType) {
        throw new Error("Transfer package cmsEntry.contentType is required.");
    }
    return {
        title,
        slug,
        contentType,
        content: typeof value.content === "string" ? value.content : "",
        tags: toStringArray(value.tags),
        options: value.options ?? {},
        metadata: value.metadata ?? {},
        publishedAt: trimToNull(value.publishedAt),
        updatedAt: trimToNull(value.updatedAt),
    };
};
const normalizeReferenceLocation = (value) => {
    if (!isRecord(value)) {
        throw new Error("Transfer package asset reference location must be an object.");
    }
    const kind = trimToNull(value.kind);
    const path = trimToNull(value.path);
    if (!kind) {
        throw new Error("Transfer package asset reference location kind is required.");
    }
    if (!path) {
        throw new Error("Transfer package asset reference location path is required.");
    }
    return {
        kind,
        path,
        originalValue: trimToNull(value.originalValue),
    };
};
const normalizePackagedAsset = (value) => {
    if (!isRecord(value)) {
        throw new Error("Transfer package asset must be an object.");
    }
    const assetId = trimToNull(value.assetId);
    const role = trimToNull(value.role);
    const targetFolderPath = trimToNull(value.targetFolderPath);
    const targetFileName = trimToNull(value.targetFileName);
    const mimeType = trimToNull(value.mimeType);
    const byteLength = Number(value.byteLength);
    const sha256 = trimToNull(value.sha256);
    const bytesBase64 = trimToNull(value.bytesBase64);
    if (!assetId || !role || !targetFolderPath || !targetFileName || !mimeType) {
        throw new Error("Transfer package asset is missing required identity fields.");
    }
    if (!Number.isFinite(byteLength) || byteLength < 0) {
        throw new Error("Transfer package asset byteLength must be a non-negative number.");
    }
    if (!sha256 || !bytesBase64) {
        throw new Error("Transfer package asset payload fields sha256 and bytesBase64 are required.");
    }
    return {
        assetId,
        role,
        targetFolderPath,
        targetFileName,
        mimeType,
        byteLength,
        sha256,
        bytesBase64,
        referenceLocations: Array.isArray(value.referenceLocations)
            ? value.referenceLocations.map((item) => normalizeReferenceLocation(item))
            : [],
        sourceFileUid: trimToNull(value.sourceFileUid),
    };
};
export const buildCmsTransferPortableEntry = (row) => {
    return {
        title: trimToNull(row.title) || "Untitled",
        slug: canonicalizeSlug(trimToNull(row.slug) || "untitled"),
        contentType: (trimToNull(row.content_type) || "text/html"),
        content: typeof row.content === "string" ? row.content : "",
        tags: Array.isArray(row.tags) ? toStringArray(row.tags) : [],
        options: row.options ?? {},
        metadata: row.metadata ?? {},
        publishedAt: trimToNull(row.published_at),
        updatedAt: trimToNull(row.updated_at),
    };
};
export const buildCmsTransferPackage = (args) => {
    return {
        schemaVersion: CMS_TRANSFER_SCHEMA_VERSION,
        exportedAt: args.exportedAt || new Date().toISOString(),
        sourceEnvironment: trimToNull(args.sourceEnvironment) || null,
        sourceCmsUid: args.row.uid,
        postType: trimToNull(args.row.post_type) || "other",
        locale: normalizeLocale(trimToNull(args.row.locale) || "en"),
        cmsEntry: buildCmsTransferPortableEntry(args.row),
        assets: args.assets || [],
        hostExtensions: args.hostExtensions || {},
        warnings: args.warnings || [],
    };
};
export const parseCmsTransferPackage = (value) => {
    const parsedValue = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(parsedValue)) {
        throw new Error("Transfer package must be a JSON object.");
    }
    const schemaVersion = trimToNull(parsedValue.schemaVersion);
    if (!schemaVersion) {
        throw new Error("Transfer package schemaVersion is required.");
    }
    const exportedAt = trimToNull(parsedValue.exportedAt);
    const sourceCmsUid = trimToNull(parsedValue.sourceCmsUid);
    const postType = trimToNull(parsedValue.postType);
    const locale = trimToNull(parsedValue.locale);
    if (!exportedAt || !sourceCmsUid || !postType || !locale) {
        throw new Error("Transfer package exportedAt, sourceCmsUid, postType, and locale are required.");
    }
    return {
        schemaVersion,
        exportedAt,
        sourceEnvironment: trimToNull(parsedValue.sourceEnvironment) || null,
        sourceCmsUid,
        postType,
        locale: normalizeLocale(locale),
        cmsEntry: normalizePortableEntry(parsedValue.cmsEntry),
        assets: Array.isArray(parsedValue.assets)
            ? parsedValue.assets.map((asset) => normalizePackagedAsset(asset))
            : [],
        hostExtensions: isRecord(parsedValue.hostExtensions)
            ? parsedValue.hostExtensions
            : {},
        warnings: toStringArray(parsedValue.warnings),
    };
};
export const stringifyCmsTransferPackage = (value, indentation = 2) => {
    return `${JSON.stringify(value, null, indentation)}\n`;
};
export const buildCmsTransferFilename = (value) => {
    const slug = canonicalizeSlug(value.cmsEntry.slug || value.sourceCmsUid || "cms-entry");
    return `${value.postType}-${value.locale}-${slug}.transfer.json`;
};
//# sourceMappingURL=transferPackage.js.map