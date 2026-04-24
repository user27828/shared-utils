export const DEFAULT_EMAIL_REQUEST_TIMEOUT_MS = 15000;
export const requestWithTimeout = async (operationName, request, timeoutMs = DEFAULT_EMAIL_REQUEST_TIMEOUT_MS) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        abortController.abort();
    }, timeoutMs);
    try {
        return await request(abortController.signal);
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
        }
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
};
//# sourceMappingURL=requestTimeout.js.map