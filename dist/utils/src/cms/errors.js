/**
 * CMS Error Types — shared-utils
 *
 * Typed error classes for the CMS system. Each carries a `statusCode`
 * and a machine-readable `code` for structured API responses.
 */
export class CmsError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = "CmsError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
/** 412 — ETag mismatch (optimistic concurrency) */
export class CmsPreconditionFailedError extends CmsError {
    constructor(message = "ETag mismatch: content has been modified") {
        super(message, 412, "PRECONDITION_FAILED");
        this.name = "CmsPreconditionFailedError";
    }
}
/** 409 — Slug change on published content without confirmation */
export class CmsConflictError extends CmsError {
    constructor(message = "Slug change on published content requires confirmation") {
        super(message, 409, "CONFLICT");
        this.name = "CmsConflictError";
    }
}
/** 404 — Content not found */
export class CmsNotFoundError extends CmsError {
    constructor(message = "Content not found") {
        super(message, 404, "NOT_FOUND");
        this.name = "CmsNotFoundError";
    }
}
/** 400 — Validation error (invalid slug, content type, post type, locale) */
export class CmsValidationError extends CmsError {
    constructor(message = "Validation error", details) {
        super(message, 400, "VALIDATION_ERROR");
        this.name = "CmsValidationError";
        this.details = details;
    }
}
/** 423 — Content locked by another user */
export class CmsLockedError extends CmsError {
    constructor(message = "Content is locked by another user", lockedBy, lockedAt) {
        super(message, 423, "LOCKED");
        this.name = "CmsLockedError";
        this.lockedBy = lockedBy;
        this.lockedAt = lockedAt;
    }
}
/** 401 — Authentication required */
export class CmsAuthenticationError extends CmsError {
    constructor(message = "Authentication required") {
        super(message, 401, "AUTHENTICATION_REQUIRED");
        this.name = "CmsAuthenticationError";
    }
}
/** 403 — Authorization failed */
export class CmsAuthorizationError extends CmsError {
    constructor(message = "Insufficient permissions") {
        super(message, 403, "AUTHORIZATION_FAILED");
        this.name = "CmsAuthorizationError";
    }
}
/** Type guard for CmsError */
export const isCmsError = (err) => {
    return err instanceof CmsError;
};
/** Map a CmsError to a JSON-serializable API response body */
export const cmsErrorToResponse = (err) => {
    const resp = {
        success: false,
        message: err.message,
        code: err.code,
    };
    if (err instanceof CmsValidationError && err.details) {
        resp.details = err.details;
    }
    return resp;
};
