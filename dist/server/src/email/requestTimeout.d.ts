export declare const DEFAULT_EMAIL_REQUEST_TIMEOUT_MS = 15000;
export declare const requestWithTimeout: <T>(operationName: string, request: (signal: AbortSignal) => Promise<T>, timeoutMs?: number) => Promise<T>;
//# sourceMappingURL=requestTimeout.d.ts.map