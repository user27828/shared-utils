import type { FmObjectRef } from "../../../../utils/src/fm/types.js";
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
export declare const encodeFmStorageKey: (ref: FmObjectRef) => string;
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
export declare const decodeFmStorageKey: (storageKey: string) => FmObjectRef;
/**
 * Try to decode a serialized storage key, returning `null` on failure
 * instead of throwing. Useful for consumer code that expects graceful fallback.
 *
 * @param storageKey - A serialized storage key string.
 * @returns The decoded FmObjectRef, or `null` if the key is invalid.
 */
export declare const tryDecodeFmStorageKey: (storageKey: string) => FmObjectRef | null;
//# sourceMappingURL=storageKey.d.ts.map