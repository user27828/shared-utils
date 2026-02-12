export declare class CmsError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode: number, code: string);
}
export declare class CmsPreconditionFailedError extends CmsError {
    constructor(message?: string);
}
export declare class CmsConflictError extends CmsError {
    constructor(message?: string);
}
export declare class CmsNotFoundError extends CmsError {
    constructor(message?: string);
}
export declare class CmsValidationError extends CmsError {
    readonly details?: Record<string, string>;
    constructor(message?: string, details?: Record<string, string>);
}
export declare class CmsLockedError extends CmsError {
    readonly lockedBy?: string;
    readonly lockedAt?: string;
    constructor(message?: string, lockedBy?: string, lockedAt?: string);
}
export declare class CmsAuthenticationError extends CmsError {
    constructor(message?: string);
}
export declare class CmsAuthorizationError extends CmsError {
    constructor(message?: string);
}
export declare const isCmsError: (err: unknown) => err is CmsError;
export declare const cmsErrorToResponse: (err: CmsError) => {
    success: false;
    message: string;
    code: string;
    details?: Record<string, string>;
};
//# sourceMappingURL=errors.d.ts.map