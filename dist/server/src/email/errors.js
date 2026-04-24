export class EmailError extends Error {
    code;
    context;
    timestamp;
    constructor(message, code = "EMAIL_ERROR", context) {
        super(message);
        this.name = "EmailError";
        this.code = code;
        this.context = context;
        this.timestamp = new Date();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, EmailError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
        };
    }
}
export class EmailProviderError extends EmailError {
    provider;
    providerCode;
    retryable;
    constructor(message, provider, options) {
        super(message, "EMAIL_PROVIDER_ERROR", {
            ...options?.context,
            provider,
            providerCode: options?.providerCode,
        });
        this.name = "EmailProviderError";
        this.provider = provider;
        this.providerCode = options?.providerCode;
        this.retryable = options?.retryable ?? false;
    }
}
export const isEmailError = (error) => {
    return error instanceof EmailError;
};
//# sourceMappingURL=errors.js.map