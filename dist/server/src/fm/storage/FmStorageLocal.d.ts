import type { FmCopyObjectInput, FmDeleteObjectInput, FmHeadObjectResult, FmObjectRef, FmStorageAdapter, FmStorageCapabilities, FmWriteObjectInput } from "./FmStorageAdapter.js";
/**
 * Local filesystem storage adapter.
 *
 * Stores objects under a configurable data root directory. Includes
 * path-traversal protection to prevent directory escape attacks.
 */
export declare class FmStorageLocal implements FmStorageAdapter {
    private dataRootAbsPath;
    constructor(params: {
        dataRootAbsPath: string;
    });
    /** @returns `"local"` provider identifier. */
    getProvider(): "local";
    /** @returns Capability flags for local storage (no presign, no public URLs). */
    getCapabilities(): FmStorageCapabilities;
    /** Check if a file exists and return its size. */
    headObject(input: {
        ref: FmObjectRef;
    }): Promise<FmHeadObjectResult>;
    /** Read a byte range from a file on disk. */
    readObjectRange(input: {
        ref: FmObjectRef;
        start: number;
        endInclusive: number;
    }): Promise<Buffer>;
    /** Write a buffer to disk, creating parent directories as needed. */
    writeObject(input: FmWriteObjectInput): Promise<void>;
    /** Delete a file from disk. No-op if the file does not exist. */
    deleteObject(input: FmDeleteObjectInput): Promise<void>;
    /** Copy a file to a new location, creating parent directories as needed. */
    copyObject(input: FmCopyObjectInput): Promise<void>;
}
//# sourceMappingURL=FmStorageLocal.d.ts.map