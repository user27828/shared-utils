/**
 * FM Storage Key Utilities — shared-utils
 *
 * Encode/decode FmObjectRef ↔ serialized storage key strings.
 * Uses the format: `${bucket}/${objectKey}`
 *
 * Extracted from: db-supabase/server/fm/utils/storageKey.ts
 */
import path from "path";
/**
 * Validate that a storage bucket name is non-empty, contains no slashes,
 * and has no path-traversal sequences.
 *
 * @param bucket - The bucket name to validate.
 * @throws If the bucket name is invalid.
 */
const assertValidBucket = (bucket) => {
    if (!bucket || typeof bucket !== "string") {
        throw new Error("Invalid bucket");
    }
    if (bucket.includes("/") || bucket.includes("\\")) {
        throw new Error("Invalid bucket: must not contain slashes");
    }
    if (bucket.includes("..")) {
        throw new Error("Invalid bucket");
    }
};
/**
 * Validate that a storage object key is non-empty and relative (not absolute).
 *
 * @param objectKey - The object key to validate.
 * @throws If the object key is invalid or absolute.
 */
const assertValidObjectKey = (objectKey) => {
    if (!objectKey || typeof objectKey !== "string") {
        throw new Error("Invalid objectKey");
    }
    if (path.isAbsolute(objectKey)) {
        throw new Error("Invalid objectKey: must be relative");
    }
};
/**
 * Encode an `FmObjectRef` (bucket + objectKey) into a single serialized
 * storage key string in the format `bucket/objectKey`.
 *
 * Both the bucket and object key are validated before encoding.
 *
 * @param ref - The object reference containing `bucket` and `objectKey`.
 * @returns A serialized storage key (e.g. `"my-bucket/path/to/file.png"`).
 * @throws If the bucket or object key is invalid.
 */
export const encodeFmStorageKey = (ref) => {
    assertValidBucket(ref.bucket);
    assertValidObjectKey(ref.objectKey);
    return `${ref.bucket}/${ref.objectKey}`;
};
/**
 * Decode a serialized storage key string back into an `FmObjectRef`.
 *
 * Splits on the first `/` to separate bucket from object key, then validates
 * both components.
 *
 * NOTE: This version THROWS on invalid input. If you need a null-returning
 * variant, wrap with try/catch or use `tryDecodeFmStorageKey`.
 *
 * @param storageKey - A serialized storage key (e.g. `"my-bucket/path/to/file.png"`).
 * @returns The decoded object reference with `bucket` and `objectKey`.
 * @throws If the storage key is empty, malformed, or contains invalid components.
 */
export const decodeFmStorageKey = (storageKey) => {
    if (!storageKey || typeof storageKey !== "string") {
        throw new Error("Invalid storageKey");
    }
    const firstSlash = storageKey.indexOf("/");
    if (firstSlash <= 0 || firstSlash === storageKey.length - 1) {
        throw new Error("Invalid storageKey format");
    }
    const bucket = storageKey.slice(0, firstSlash);
    const objectKey = storageKey.slice(firstSlash + 1);
    assertValidBucket(bucket);
    assertValidObjectKey(objectKey);
    return { bucket, objectKey };
};
/**
 * Try to decode a serialized storage key, returning `null` on failure
 * instead of throwing. Useful for consumer code that expects graceful fallback.
 *
 * @param storageKey - A serialized storage key string.
 * @returns The decoded FmObjectRef, or `null` if the key is invalid.
 */
export const tryDecodeFmStorageKey = (storageKey) => {
    try {
        return decodeFmStorageKey(storageKey);
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=storageKey.js.map