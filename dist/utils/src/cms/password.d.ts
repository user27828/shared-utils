/**
 * Hash a CMS content password.
 * Returns null if the input is empty.
 */
export declare const hashCmsPassword: (password: string) => Promise<string | null>;
/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns false if either input is empty.
 */
export declare const verifyCmsPassword: (password: string, hash: string) => Promise<boolean>;
//# sourceMappingURL=password.d.ts.map