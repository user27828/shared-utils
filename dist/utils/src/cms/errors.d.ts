/**
 * CMS Error Types — shared-utils
 *
 * Typed error classes for the CMS system. Each carries a `statusCode`
 * and a machine-readable `code` for structured API responses.
 */
export declare class CmsError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode: number, code: string);
}
/** 412 — ETag mismatch (optimistic concurrency) */
export declare class CmsPreconditionFailedError extends CmsError {
    constructor(message?: string);
}
/** 409 — Slug change on published content without confirmation */
export declare class CmsConflictError extends CmsError {
    constructor(message?: string);
}
/** 404 — Content not found */
export declare class CmsNotFoundError extends CmsError {
    constructor(message?: string);
}
/** 400 — Validation error (invalid slug, content type, post type, locale) */
export declare class CmsValidationError extends CmsError {
    readonly details?: Record<string, string>;
    constructor(message?: string, details?: Record<string, string>);
}
/** 423 — Content locked by another user */
export declare class CmsLockedError extends CmsError {
    readonly lockedBy?: string;
    readonly lockedAt?: string;
    constructor(message?: string, lockedBy?: string, lockedAt?: string);
}
/** 401 — Authentication required */
export declare class CmsAuthenticationError extends CmsError {
    constructor(message?: string);
}
/** 403 — Authorization failed */
export declare class CmsAuthorizationError extends CmsError {
    constructor(message?: string);
}
/** Type guard for CmsError */
export declare const isCmsError: (err: unknown) => err is CmsError;
/** Map a CmsError to a JSON-serializable API response body */
export declare const cmsErrorToResponse: (err: CmsError) => {
    success: false;
    message: string;
    code: string;
    details?: Record<string, string>;
};
//# sourceMappingURL=errors.d.ts.map