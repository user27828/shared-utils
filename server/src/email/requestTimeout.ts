export const DEFAULT_EMAIL_REQUEST_TIMEOUT_MS = 15000;

export const requestWithTimeout = async <T>(
  operationName: string,
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs = DEFAULT_EMAIL_REQUEST_TIMEOUT_MS,
): Promise<T> => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    return await request(abortController.signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
