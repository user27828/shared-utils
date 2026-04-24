export declare class EmailError extends Error {
    readonly code: string;
    readonly context?: Record<string, any>;
    readonly timestamp: Date;
    constructor(message: string, code?: string, context?: Record<string, any>);
    toJSON(): Record<string, any>;
}
export declare class EmailProviderError extends EmailError {
    readonly provider: string;
    readonly providerCode?: string;
    readonly retryable: boolean;
    constructor(message: string, provider: string, options?: {
        providerCode?: string;
        retryable?: boolean;
        context?: Record<string, any>;
    });
}
export declare const isEmailError: (error: unknown) => error is EmailError;
//# sourceMappingURL=errors.d.ts.map