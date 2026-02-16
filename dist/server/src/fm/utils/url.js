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
export const resolveClientUrl = (params) => {
    if (params?.clientUrl) {
        return params.clientUrl;
    }
    const req = params?.req;
    const origin = req?.headers?.origin;
    if (typeof origin === "string" && origin) {
        return origin;
    }
    const referer = req?.headers?.referer;
    if (typeof referer === "string" && referer) {
        try {
            const url = new URL(referer);
            return `${url.protocol}//${url.host}`;
        }
        catch {
            // ignore
        }
    }
    const protocol = req?.secure ? "https" : "http";
    const host = req?.headers?.host || "localhost";
    return `${protocol}://${host}`;
};
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
export const buildCanonicalMediaUrl = (params) => {
    const prefix = params.pathPrefix || "/media";
    const base = resolveClientUrl({
        clientUrl: params.clientUrl,
        req: params.req,
    });
    return `${base.replace(/\/+$/, "")}${prefix}/${encodeURIComponent(params.uid)}`;
};
//# sourceMappingURL=url.js.map