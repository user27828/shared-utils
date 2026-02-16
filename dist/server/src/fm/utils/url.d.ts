/**
 * FM URL Utilities — shared-utils
 *
 * Resolve client/base URLs and build canonical media URLs.
 *
 * Refactored from db-supabase/server/fm/utils/url.ts to accept an explicit
 * `clientUrl` parameter instead of depending on the `getConfiguration()` singleton.
 *
 * Extracted from: db-supabase/server/fm/utils/url.ts
 */
/**
 * Minimal Express-like request shape used by {@link resolveClientUrl}.
 * Avoids a hard dependency on Express types.
 */
export interface FmRequestLike {
    headers?: Record<string, unknown>;
    secure?: boolean;
}
/**
 * Resolve an absolute client/base URL for generating canonical links.
 *
 * Preference order:
 * 1. Explicit `clientUrl` parameter (recommended)
 * 2. `Origin` header from the request
 * 3. `Referer` header inference from the request
 * 4. `protocol://host` fallback derived from request properties
 *
 * The db-supabase layer can supply `clientUrl` from its own `getConfiguration()` call,
 * keeping this function pure and testable.
 *
 * @param params - Resolution parameters.
 * @param params.clientUrl - Explicit client URL (highest priority).
 * @param params.req - Optional Express-like request object for header-based inference.
 * @returns An absolute URL string (e.g. `"https://example.com"`).
 */
export declare const resolveClientUrl: (params?: {
    clientUrl?: string;
    req?: FmRequestLike;
}) => string;
/**
 * Build a canonical public URL for an FM media file by UID.
 *
 * Consumers SHOULD treat this as the stable URL to embed in CMS content.
 * The UID is URI-encoded in the resulting path.
 *
 * @param params - URL construction parameters.
 * @param params.uid - The file's unique identifier.
 * @param params.clientUrl - Explicit client URL (highest priority for base resolution).
 * @param params.req - Optional request for base URL inference.
 * @param params.pathPrefix - URL path prefix before the UID segment (default: "/media").
 * @returns A fully-qualified canonical URL (e.g. `"https://example.com/media/abc-123"`).
 */
export declare const buildCanonicalMediaUrl: (params: {
    uid: string;
    clientUrl?: string;
    req?: FmRequestLike;
    pathPrefix?: string;
}) => string;
//# sourceMappingURL=url.d.ts.map