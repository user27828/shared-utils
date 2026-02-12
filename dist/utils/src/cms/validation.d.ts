/**
 * Normalize a BCP-47 locale string.
 * - Replaces underscores with hyphens
 * - Lowercases language, uppercases region
 */
export declare const normalizeLocale: (raw: string) => string;
/**
 * Canonicalize a slug:
 * - lowercase
 * - spaces/underscores become hyphens
 * - strip non-alphanumeric (except hyphens)
 * - collapse repeated hyphens
 * - trim leading/trailing hyphens
 */
export declare const canonicalizeSlug: (raw: string) => string;
/**
 * Validate a slug: no path separators, no traversal, matches pattern.
 */
export declare const isValidSlug: (slug: string) => boolean;
/**
 * Assert a slug is valid and not reserved.
 * @throws CmsValidationError
 */
export declare const assertValidSlug: (slug: string, reservedSlugs?: string[]) => void;
/**
 * Assert a content type is allowed.
 * @throws CmsValidationError
 */
export declare const assertAllowedContentType: (contentType: string) => void;
/**
 * Assert a post type is allowed.
 * @throws CmsValidationError
 */
export declare const assertAllowedPostType: (postType: string) => void;
/**
 * Assert a status is allowed.
 * @throws CmsValidationError
 */
export declare const assertAllowedStatus: (status: string) => void;
//# sourceMappingURL=validation.d.ts.map