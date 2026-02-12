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
export const getCmsPublicCacheHeaders = (
  opts: CmsPublicCacheHeaderOptions,
): CmsPublicCacheHeaders => {
  const headers: CmsPublicCacheHeaders = {
    "Cache-Control": "",
  };

  if (opts.isProtected) {
    headers["Cache-Control"] = "private, no-store";
    return headers;
  }

  const maxAge = opts.maxAge ?? 60;
  const sMaxAge = opts.sMaxAge ?? 300;
  headers["Cache-Control"] = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;

  if (opts.etag) {
    headers.ETag = opts.etag;
  }

  return headers;
};

/**
 * Apply CMS public cache headers to an Express-compatible response object.
 */
export const applyCmsPublicCacheHeaders = (
  res: { setHeader(name: string, value: string): void },
  opts: CmsPublicCacheHeaderOptions,
): void => {
  const headers = getCmsPublicCacheHeaders(opts);
  res.setHeader("Cache-Control", headers["Cache-Control"]);
  if (headers.ETag) {
    res.setHeader("ETag", headers.ETag);
  }
};
