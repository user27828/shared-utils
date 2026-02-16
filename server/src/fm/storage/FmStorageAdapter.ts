/**
 * FM Storage Adapter Interface — shared-utils
 *
 * Defines the contract for pluggable object storage backends (local filesystem,
 * S3-compatible, etc.). Storage adapters handle raw object I/O; they must NOT
 * perform MIME sniffing, SHA-256 hashing, or dimension extraction (those are
 * FmServiceCore responsibilities).
 *
 * FmObjectRef and FmPresignedPut are imported from the canonical FM types
 * barrel to avoid duplication with the Zod schemas.
 *
 * Extracted from: db-supabase/server/fm/storage/FmStorageAdapter.ts
 */

import type { FmObjectRef, FmPresignedPut } from "../../../../utils/src/fm/types.js";

// Re-export for convenience (consumers of the storage barrel get these too)
export type { FmObjectRef, FmPresignedPut };

// ── Storage-specific types ───────────────────────────────────────────────

/** Storage provider identifier. */
export type FmStorageProvider = "local" | "s3";

/** Capability flags indicating which operations a storage adapter supports. */
export interface FmStorageCapabilities {
  presignPut: boolean;
  presignGet: boolean;
  headObject: boolean;
  readObjectRange: boolean;
  writeObject: boolean;
  deleteObject: boolean;
  copyObject: boolean;
  publicUrl: boolean;
}

/** Result of a presigned GET URL generation. */
export interface FmPresignedGet {
  url: string;
  expiresAtIso: string;
}

/** Result of a HEAD object operation. */
export interface FmHeadObjectResult {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
  etag?: string;
  lastModifiedIso?: string;
  /**
   * Optional non-sensitive metadata attached to the object.
   *
   * For S3-compatible providers this maps to x-amz-meta-*.
   */
  metadata?: Record<string, string>;
}

/** Input for writing an object to storage. */
export interface FmWriteObjectInput {
  ref: FmObjectRef;
  body: Uint8Array | Buffer;
  contentType?: string;
  /**
   * Optional non-sensitive metadata attached to the object.
   *
   * For S3-compatible providers this maps to x-amz-meta-*.
   */
  metadata?: Record<string, string>;
}

/** Input for copying an object between locations. */
export interface FmCopyObjectInput {
  from: FmObjectRef;
  to: FmObjectRef;
}

/** Input for deleting an object from storage. */
export interface FmDeleteObjectInput {
  ref: FmObjectRef;
}

// ── Adapter interface ────────────────────────────────────────────────────

/**
 * Pluggable object storage adapter interface.
 *
 * Implementations must declare capabilities via {@link getCapabilities} and
 * only implement the methods corresponding to `true` flags. FmServiceCore
 * checks capabilities before calling optional methods.
 */
export interface FmStorageAdapter {
  getProvider(): FmStorageProvider;
  getCapabilities(): FmStorageCapabilities;

  presignPut?(input: {
    ref: FmObjectRef;
    contentType?: string;
    contentLengthBytes?: number;
    /**
     * Optional non-sensitive metadata attached to the object.
     *
     * For S3-compatible providers this maps to x-amz-meta-*.
     */
    metadata?: Record<string, string>;
    expiresInSeconds: number;
  }): Promise<FmPresignedPut>;

  presignGet?(input: {
    ref: FmObjectRef;
    expiresInSeconds: number;
    responseContentDisposition?: string;
    responseContentType?: string;
  }): Promise<FmPresignedGet>;

  headObject?(input: { ref: FmObjectRef }): Promise<FmHeadObjectResult>;

  /**
   * Read a small byte range from an object.
   *
   * Used for server-side sniffing/validation (e.g. image MIME + dimensions)
   * without downloading the entire object.
   */
  readObjectRange?(input: {
    ref: FmObjectRef;
    start: number;
    endInclusive: number;
  }): Promise<Buffer>;

  writeObject?(input: FmWriteObjectInput): Promise<void>;

  deleteObject?(input: FmDeleteObjectInput): Promise<void>;

  copyObject?(input: FmCopyObjectInput): Promise<void>;

  /**
   * Optional: a stable direct public URL for public assets.
   *
   * Note: not all schemes can provide a stable public URL; consumers should
   * prefer canonical app-controlled URLs (e.g. /media/:uid).
   */
  getPublicUrl?(input: { ref: FmObjectRef }): string | null;
}
