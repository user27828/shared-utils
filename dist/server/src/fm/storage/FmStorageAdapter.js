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
export {};
//# sourceMappingURL=FmStorageAdapter.js.map