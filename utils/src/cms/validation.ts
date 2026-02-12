/**
 * CMS Validation — shared-utils
 *
 * Slug, locale, content-type, and post-type validation utilities.
 */
import {
  CmsContentTypeSchema,
  CmsPostTypeSchema,
  CmsStatusSchema,
} from "./types.js";
import { CmsValidationError } from "./errors.js";

/**
 * Normalize a BCP-47 locale string.
 * - Replaces underscores with hyphens
 * - Lowercases language, uppercases region
 */
export const normalizeLocale = (raw: string): string => {
  const str = String(raw || "")
    .trim()
    .replace(/_/g, "-");
  const parts = str.split("-");
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  }
  return [parts[0].toLowerCase(), ...parts.slice(1).map((p) => p.toUpperCase())].join("-");
};

/**
 * Canonicalize a slug:
 * - lowercase
 * - spaces/underscores become hyphens
 * - strip non-alphanumeric (except hyphens)
 * - collapse repeated hyphens
 * - trim leading/trailing hyphens
 */
export const canonicalizeSlug = (raw: string): string => {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Validate a slug: no path separators, no traversal, matches pattern.
 */
export const isValidSlug = (slug: string): boolean => {
  if (!slug || slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
    return false;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

/**
 * Assert a slug is valid and not reserved.
 * @throws CmsValidationError
 */
export const assertValidSlug = (
  slug: string,
  reservedSlugs: string[] = [],
): void => {
  if (!isValidSlug(slug)) {
    throw new CmsValidationError(`Invalid slug: "${slug}"`, {
      slug: "Slug must contain only lowercase alphanumeric characters and hyphens",
    });
  }
  if (reservedSlugs.includes(slug)) {
    throw new CmsValidationError(`Reserved slug: "${slug}"`, {
      slug: `"${slug}" is reserved and cannot be used`,
    });
  }
};

/**
 * Assert a content type is allowed.
 * @throws CmsValidationError
 */
export const assertAllowedContentType = (contentType: string): void => {
  const result = CmsContentTypeSchema.safeParse(contentType);
  if (!result.success) {
    throw new CmsValidationError(`Invalid content type: "${contentType}"`, {
      content_type: `Must be one of: ${CmsContentTypeSchema.options.join(", ")}`,
    });
  }
};

/**
 * Assert a post type is allowed.
 * @throws CmsValidationError
 */
export const assertAllowedPostType = (postType: string): void => {
  const result = CmsPostTypeSchema.safeParse(postType);
  if (!result.success) {
    throw new CmsValidationError(`Invalid post type: "${postType}"`, {
      post_type: `Must be one of: ${CmsPostTypeSchema.options.join(", ")}`,
    });
  }
};

/**
 * Assert a status is allowed.
 * @throws CmsValidationError
 */
export const assertAllowedStatus = (status: string): void => {
  const result = CmsStatusSchema.safeParse(status);
  if (!result.success) {
    throw new CmsValidationError(`Invalid status: "${status}"`, {
      status: `Must be one of: ${CmsStatusSchema.options.join(", ")}`,
    });
  }
};
