/**
 * CMS Password — shared-utils
 *
 * Password hashing and verification for content protection.
 * Uses bcryptjs for secure hashing.
 */
import bcrypt from "bcryptjs";
const BCRYPT_ROUNDS = 12;
/**
 * Hash a CMS content password.
 * Returns null if the input is empty.
 */
export const hashCmsPassword = async (password) => {
    const trimmed = String(password || "").trim();
    if (!trimmed) {
        return null;
    }
    return bcrypt.hash(trimmed, BCRYPT_ROUNDS);
};
/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns false if either input is empty.
 */
export const verifyCmsPassword = async (password, hash) => {
    if (!password || !hash) {
        return false;
    }
    return bcrypt.compare(password, hash);
};
