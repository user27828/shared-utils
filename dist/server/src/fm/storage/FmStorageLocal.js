/**
 * FM Local Filesystem Storage Adapter — shared-utils
 *
 * Stores objects on the local filesystem under a configurable data root.
 * Includes path-traversal security (assertSafeStorageRef + resolveUnderRoot)
 * to prevent directory escape attacks.
 *
 * Capabilities: headObject, readObjectRange, writeObject, deleteObject,
 * copyObject. Presign and public URL are not supported (local storage
 * requires server-proxied uploads and canonical media URLs).
 *
 * Extracted from: db-supabase/server/fm/storage/FmStorageLocal.ts
 */
import fs from "fs/promises";
import path from "path";
// ── Security helpers ─────────────────────────────────────────────────────
const assertSafeStorageRef = (ref) => {
    if (!ref.bucket) {
        throw new Error("bucket is required");
    }
    if (!ref.objectKey) {
        throw new Error("objectKey is required");
    }
    if (ref.bucket.includes("..") || ref.bucket.includes("/")) {
        throw new Error("Invalid bucket");
    }
    if (path.isAbsolute(ref.objectKey)) {
        throw new Error("Invalid objectKey: must be relative");
    }
};
const resolveUnderRoot = (rootAbs, ref) => {
    // rootAbs must be absolute
    const absRoot = path.resolve(rootAbs);
    const candidate = path.resolve(absRoot, ref.bucket, ref.objectKey);
    // Boundary check (chroot-like)
    const rootWithSep = absRoot.endsWith(path.sep)
        ? absRoot
        : `${absRoot}${path.sep}`;
    if (!candidate.startsWith(rootWithSep)) {
        throw new Error("Invalid path: escapes data root");
    }
    return candidate;
};
// ── Adapter ──────────────────────────────────────────────────────────────
/**
 * Local filesystem storage adapter.
 *
 * Stores objects under a configurable data root directory. Includes
 * path-traversal protection to prevent directory escape attacks.
 */
export class FmStorageLocal {
    dataRootAbsPath;
    constructor(params) {
        this.dataRootAbsPath = params.dataRootAbsPath;
    }
    /** @returns `"local"` provider identifier. */
    getProvider() {
        return "local";
    }
    /** @returns Capability flags for local storage (no presign, no public URLs). */
    getCapabilities() {
        return {
            presignPut: false,
            presignGet: false,
            headObject: true,
            readObjectRange: true,
            writeObject: true,
            deleteObject: true,
            copyObject: true,
            publicUrl: false,
        };
    }
    /** Check if a file exists and return its size. */
    async headObject(input) {
        assertSafeStorageRef(input.ref);
        const absPath = resolveUnderRoot(this.dataRootAbsPath, input.ref);
        try {
            const stat = await fs.stat(absPath);
            if (!stat.isFile()) {
                return { exists: false };
            }
            return { exists: true, sizeBytes: stat.size };
        }
        catch (e) {
            if (e?.code === "ENOENT") {
                return { exists: false };
            }
            throw e;
        }
    }
    /** Read a byte range from a file on disk. */
    async readObjectRange(input) {
        assertSafeStorageRef(input.ref);
        const absPath = resolveUnderRoot(this.dataRootAbsPath, input.ref);
        const start = Math.max(0, Math.floor(input.start));
        const endInclusive = Math.max(start, Math.floor(input.endInclusive));
        const length = endInclusive - start + 1;
        const fh = await fs.open(absPath, "r");
        try {
            const buf = Buffer.alloc(length);
            const { bytesRead } = await fh.read(buf, 0, length, start);
            return buf.slice(0, bytesRead);
        }
        finally {
            await fh.close();
        }
    }
    /** Write a buffer to disk, creating parent directories as needed. */
    async writeObject(input) {
        assertSafeStorageRef(input.ref);
        const absPath = resolveUnderRoot(this.dataRootAbsPath, input.ref);
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, input.body);
    }
    /** Delete a file from disk. No-op if the file does not exist. */
    async deleteObject(input) {
        assertSafeStorageRef(input.ref);
        const absPath = resolveUnderRoot(this.dataRootAbsPath, input.ref);
        try {
            await fs.unlink(absPath);
        }
        catch (e) {
            if (e?.code === "ENOENT") {
                return;
            }
            throw e;
        }
    }
    /** Copy a file to a new location, creating parent directories as needed. */
    async copyObject(input) {
        assertSafeStorageRef(input.from);
        assertSafeStorageRef(input.to);
        const absFrom = resolveUnderRoot(this.dataRootAbsPath, input.from);
        const absTo = resolveUnderRoot(this.dataRootAbsPath, input.to);
        await fs.mkdir(path.dirname(absTo), { recursive: true });
        await fs.copyFile(absFrom, absTo);
    }
}
//# sourceMappingURL=FmStorageLocal.js.map