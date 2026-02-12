/**
 * CMS Cache-Control Headers — shared-utils
 *
 * Deterministic cache headers for public CMS content:
 * - Unprotected: public, max-age=60, s-maxage=300 + ETag
 * - Protected:   private, no-store
 */
export interface CmsPublicCacheHeaderOptions {
    etag: string | null;
    isProtected: boolean;
    /** Override max-age for unprotected content (default: 60). */
    maxAge?: number;
    /** Override s-maxage for unprotected content (default: 300). */
    sMaxAge?: number;
}
export interface CmsPublicCacheHeaders {
    "Cache-Control": string;
    ETag?: string;
}
/**
 * Compute CMS public cache headers.
 */
export declare const getCmsPublicCacheHeaders: (opts: CmsPublicCacheHeaderOptions) => CmsPublicCacheHeaders;
/**
 * Apply CMS public cache headers to an Express-compatible response object.
 */
export declare const applyCmsPublicCacheHeaders: (res: {
    setHeader(name: string, value: string): void;
}, opts: CmsPublicCacheHeaderOptions) => void;
//# sourceMappingURL=cacheControl.d.ts.map