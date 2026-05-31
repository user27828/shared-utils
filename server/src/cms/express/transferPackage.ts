import type { CmsContentType, CmsHeadRow } from "../../../../utils/src/cms/types.js";
import {
  canonicalizeSlug,
  normalizeLocale,
} from "../../../../utils/src/cms/validation.js";

export const CMS_TRANSFER_SCHEMA_VERSION = "1.0";

export type CmsTransferAssetRole =
  | "body_content_reference"
  | "featured_image"
  | "og_image"
  | "attachment";

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
};

const trimToNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => trimToNull(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeTransferAssetPathSegments = (value: string): string[] => {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => Boolean(segment) && segment !== "." && segment !== "..");
};

export const buildCmsTransferAssetTargetFolderPath = (input: {
  bucket: string;
  objectKey: string;
}): string => {
  const bucket = trimToNull(input.bucket);
  if (!bucket) {
    throw new Error("Transfer asset bucket is required.");
  }

  const objectKeySegments = normalizeTransferAssetPathSegments(input.objectKey);
  const folderSegments = objectKeySegments.slice(0, -1);

  return [bucket, ...folderSegments].join("/");
};

export const parseCmsTransferAssetTargetFolderPath = (value: string): {
  bucket: string;
  folderPath: string;
} => {
  const segments = normalizeTransferAssetPathSegments(value);
  if (segments.length === 0) {
    throw new Error(
      "Transfer asset targetFolderPath must include a destination bucket.",
    );
  }

  const [bucket, ...folderSegments] = segments;

  return {
    bucket,
    folderPath: folderSegments.join("/"),
  };
};

const normalizePortableEntry = (
  value: unknown,
): CmsTransferPortableEntry => {
  if (!isRecord(value)) {
    throw new Error("Transfer package cmsEntry must be an object.");
  }

  const title = trimToNull(value.title);
  const slug = trimToNull(
    canonicalizeSlug(typeof value.slug === "string" ? value.slug : ""),
  );
  const contentType = trimToNull(value.contentType) as CmsContentType | null;

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

const normalizeReferenceLocation = (
  value: unknown,
): CmsTransferReferenceLocation => {
  if (!isRecord(value)) {
    throw new Error("Transfer package asset reference location must be an object.");
  }

  const kind = trimToNull(value.kind) as CmsTransferAssetRole | null;
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

const normalizePackagedAsset = (value: unknown): CmsTransferPackagedAsset => {
  if (!isRecord(value)) {
    throw new Error("Transfer package asset must be an object.");
  }

  const assetId = trimToNull(value.assetId);
  const role = trimToNull(value.role) as CmsTransferAssetRole | null;
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

export const buildCmsTransferPortableEntry = (
  row: CmsHeadRow,
): CmsTransferPortableEntry => {
  return {
    title: trimToNull(row.title) || "Untitled",
    slug: canonicalizeSlug(trimToNull(row.slug) || "untitled"),
    contentType: (trimToNull(row.content_type) || "text/html") as CmsContentType,
    content: typeof row.content === "string" ? row.content : "",
    tags: Array.isArray(row.tags) ? toStringArray(row.tags) : [],
    options: row.options ?? {},
    metadata: row.metadata ?? {},
    publishedAt: trimToNull(row.published_at),
    updatedAt: trimToNull(row.updated_at),
  };
};

export const buildCmsTransferPackage = (args: {
  row: CmsHeadRow;
  assets?: CmsTransferPackagedAsset[];
  hostExtensions?: Record<string, unknown>;
  warnings?: string[];
  sourceEnvironment?: string | null;
  exportedAt?: string;
}): CmsTransferPackage => {
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

export const parseCmsTransferPackage = (
  value: string | unknown,
): CmsTransferPackage => {
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
    throw new Error(
      "Transfer package exportedAt, sourceCmsUid, postType, and locale are required.",
    );
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

export const stringifyCmsTransferPackage = (
  value: CmsTransferPackage,
  indentation: number = 2,
): string => {
  return `${JSON.stringify(value, null, indentation)}\n`;
};

export const buildCmsTransferFilename = (value: CmsTransferPackage): string => {
  const slug = canonicalizeSlug(value.cmsEntry.slug || value.sourceCmsUid || "cms-entry");
  return `${value.postType}-${value.locale}-${slug}.transfer.json`;
};
