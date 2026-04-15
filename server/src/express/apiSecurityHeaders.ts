type HeaderCapableResponse = {
  getHeader(name: string): unknown;
  setHeader(name: string, value: string): unknown;
};

type NextLike = (...args: unknown[]) => void;

/**
 * Apply baseline response hardening headers to API responses.
 *
 * Avoid overriding an explicit downstream value if one has already been set.
 */
export const apiResponseSecurityHeaders = (
  _req: unknown,
  res: HeaderCapableResponse,
  next: NextLike,
): void => {
  if (!res.getHeader("X-Content-Type-Options")) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  }

  next();
};
