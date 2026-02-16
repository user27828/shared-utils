import type { FmCopyObjectInput, FmDeleteObjectInput, FmHeadObjectResult, FmObjectRef, FmPresignedGet, FmPresignedPut, FmStorageAdapter, FmStorageCapabilities, FmWriteObjectInput } from "./FmStorageAdapter.js";
/**
 * S3-compatible object storage adapter.
 *
 * Supports presigned uploads/downloads, head, read range, write, delete,
 * copy, and optional public URL generation.
 */
export declare class FmStorageS3 implements FmStorageAdapter {
    private client;
    private publicBaseUrl?;
    constructor(params: {
        endpoint: string;
        region?: string;
        accessKeyId: string;
        secretAccessKey: string;
        forcePathStyle?: boolean;
        publicBaseUrl?: string;
    });
    /** @returns `"s3"` provider identifier. */
    getProvider(): "s3";
    /** @returns Capability flags for S3 storage (all capabilities supported). */
    getCapabilities(): FmStorageCapabilities;
    /** Read a byte range from an S3 object via the Range header. */
    readObjectRange(input: {
        ref: FmObjectRef;
        start: number;
        endInclusive: number;
    }): Promise<Buffer>;
    /** Generate a presigned PUT URL for direct client-side uploads. */
    presignPut(input: {
        ref: FmObjectRef;
        contentType?: string;
        contentLengthBytes?: number;
        metadata?: Record<string, string>;
        expiresInSeconds: number;
    }): Promise<FmPresignedPut>;
    /** Generate a presigned GET URL for time-limited downloads. */
    presignGet(input: {
        ref: FmObjectRef;
        expiresInSeconds: number;
        responseContentDisposition?: string;
        responseContentType?: string;
    }): Promise<FmPresignedGet>;
    /** Write an object via PutObject (server-proxied upload). */
    writeObject(input: FmWriteObjectInput): Promise<void>;
    /** Check if an object exists and return its metadata. */
    headObject(input: {
        ref: FmObjectRef;
    }): Promise<FmHeadObjectResult>;
    /** Delete an object via DeleteObject. */
    deleteObject(input: FmDeleteObjectInput): Promise<void>;
    /** Copy an object to a new location, preserving metadata. */
    copyObject(input: FmCopyObjectInput): Promise<void>;
    /** Build a public URL for the object using the configured base URL. */
    getPublicUrl(input: {
        ref: FmObjectRef;
    }): string | null;
}
//# sourceMappingURL=FmStorageS3.d.ts.map