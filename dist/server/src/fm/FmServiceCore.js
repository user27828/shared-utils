/**
 * FM Service Core — shared-utils
 *
 * Database-agnostic upload orchestration, lifecycle management, and URL
 * resolution for the File Manager system. All persistence is delegated to
 * a pluggable FmConnector; all object I/O is delegated to a pluggable
 * FmStorageAdapter. This class owns:
 *
 *  - Upload init / finalize (direct + proxied) for files and variants
 *  - MIME sniffing and image dimension validation on finalize
 *  - SHA-256 hashing (local provider) and client-reported hash acceptance (S3)
 *  - Archive / restore / soft-delete / hard-delete with link-safety checks
 *  - Move (copy-then-delete with metadata update)
 *  - Variant picking logic (thumb=smallest, web=largest, preview=median)
 *  - URL resolution (public → signed → canonical fallback)
 *  - Storage object metadata read
 *  - Link management (create / delete / list)
 *  - Metadata patching with local-storage is_public enforcement
 *  - Post-write hook invocations (best-effort)
 *
 * Ported from: db-supabase/server/fm/service/fmService.ts (~1372 lines)
 * Additional content streaming + link + patch logic from: AgentM.Resume/server/src/routes/fmExtras.ts
 *
 * Key architectural changes from the original:
 *  - No SupabaseClient parameter — uses FmConnector interface
 *  - No getConfiguration() singleton — uses injected FmServiceCoreConfig
 *  - No getFmStorageAdapter() singleton — uses injected FmStorageAdapter
 *  - Raw `throw new Error(...)` replaced with typed FmError subclasses
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { FmUploadInitRequestSchema, FmUploadFinalizeRequestSchema, FmVariantUploadInitRequestSchema, FmVariantUploadFinalizeRequestSchema, } from "../../../utils/src/fm/types.js";
import { FmNotFoundError, FmValidationError, FmStorageError, FmAuthorizationError, FmPolicyError, } from "../../../utils/src/fm/errors.js";
import { getFmUploadPathPresetsFromConfig, resolveFmLocalUploadRootAbsPath, } from "./config.js";
import { encodeFmStorageKey, decodeFmStorageKey } from "./utils/storageKey.js";
import { buildFmObjectKey, sanitizeFmFolderPath } from "./utils/objectKey.js";
import { validateFmUploadInputs } from "./policy/allowlists.js";
import { buildCanonicalMediaUrl } from "./utils/url.js";
import { buildFmObjectMetadataForInit, buildFmObjectMetadataForExistingFile, } from "./utils/objectMetadata.js";
import { sniffMimeFromHeader } from "./utils/mimeSniff.js";
import { extractImageDimensionsFromHeader } from "./utils/imageDimensions.js";
// ── Configuration ────────────────────────────────────────────────────────
const DEFAULT_BUCKET_CMS = "cms";
const DEFAULT_BUCKET_USER_UPLOADS = "user-uploads";
const DEFAULT_SIGNED_URL_TTL_SECS = 300;
// ── Internal helpers ─────────────────────────────────────────────────────
const resolveBucketForPurpose = (config, purpose) => {
    if (purpose === "resume" || purpose === "job") {
        return config.bucketUserUploads || DEFAULT_BUCKET_USER_UPLOADS;
    }
    return config.bucketCms || DEFAULT_BUCKET_CMS;
};
const resolveVisibility = (visibility) => {
    return visibility === "public";
};
const getSignedUrlTtlSeconds = (config) => {
    if (config.signedUrlTtlSeconds && config.signedUrlTtlSeconds > 0) {
        return config.signedUrlTtlSeconds;
    }
    return DEFAULT_SIGNED_URL_TTL_SECS;
};
const computeLocalSha256Hex = async (input) => {
    const absRoot = path.resolve(input.dataRootAbsPath);
    const candidate = path.resolve(absRoot, input.ref.bucket, input.ref.objectKey);
    const rootWithSep = absRoot.endsWith(path.sep)
        ? absRoot
        : `${absRoot}${path.sep}`;
    if (!candidate.startsWith(rootWithSep)) {
        throw new FmValidationError("Invalid path: escapes data root");
    }
    return await new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(candidate);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(hash.digest("hex")));
    });
};
const readObjectHeaderBytes = async (input) => {
    const caps = input.adapter.getCapabilities();
    if (!caps.readObjectRange || !input.adapter.readObjectRange) {
        throw new FmStorageError("Storage adapter does not support readObjectRange");
    }
    const maxBytes = Math.max(1, Math.min(64 * 1024, Math.floor(input.maxBytes)));
    return await input.adapter.readObjectRange({
        ref: input.ref,
        start: 0,
        endInclusive: maxBytes - 1,
    });
};
const sniffLocalMimeType = async (input) => {
    const absRoot = path.resolve(input.dataRootAbsPath);
    const candidate = path.resolve(absRoot, input.ref.bucket, input.ref.objectKey);
    const rootWithSep = absRoot.endsWith(path.sep)
        ? absRoot
        : `${absRoot}${path.sep}`;
    if (!candidate.startsWith(rootWithSep)) {
        throw new FmValidationError("Invalid path: escapes data root");
    }
    const fd = await fs.promises.open(candidate, "r");
    try {
        const buf = Buffer.alloc(64);
        const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
        return sniffMimeFromHeader(buf.slice(0, bytesRead));
    }
    finally {
        await fd.close();
    }
};
const clampPositiveInt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) {
        return undefined;
    }
    return Math.floor(v);
};
const validateVariantKindAndTarget = (input) => {
    const kind = input.variantKind;
    const w = input.width;
    const h = input.height;
    if (w !== undefined && w > 4096) {
        throw new FmValidationError("Variant width too large");
    }
    if (h !== undefined && h > 4096) {
        throw new FmValidationError("Variant height too large");
    }
    if (kind === "thumb") {
        if (w !== undefined && w > 512) {
            throw new FmValidationError("thumb width exceeds limit");
        }
    }
    if (kind === "preview") {
        if (w !== undefined && w > 1024) {
            throw new FmValidationError("preview width exceeds limit");
        }
    }
    // web is allowed up to 4096 boundary
};
const getObjectFilename = (objectKey) => {
    const parts = String(objectKey || "")
        .split("/")
        .filter(Boolean);
    return parts[parts.length - 1] || objectKey;
};
const buildMovedObjectKey = (input) => {
    const folder = sanitizeFmFolderPath(input.folderPath);
    return folder ? `${folder}/${input.filename}` : input.filename;
};
/**
 * Pick the best variant from a list for a given requested kind.
 *
 * Selection strategy:
 *  - thumb: smallest by width
 *  - web: largest by width
 *  - preview: median by width
 *  - If no exact match, fall back to "web" variants for thumb/preview requests
 */
const pickVariant = (variants, kind) => {
    const exact = variants.filter((vv) => vv.variant_kind === kind);
    const candidates = exact.length
        ? exact
        : kind === "thumb" || kind === "preview"
            ? variants.filter((vv) => vv.variant_kind === "web")
            : [];
    if (!candidates.length) {
        return undefined;
    }
    const byWidth = candidates
        .filter((vv) => typeof vv.width === "number" && vv.width > 0)
        .slice()
        .sort((a, b) => a.width - b.width);
    const ordered = byWidth.length ? byWidth : candidates;
    if (kind === "thumb") {
        return ordered[0];
    }
    if (kind === "web") {
        return ordered[ordered.length - 1];
    }
    if (kind === "preview") {
        return ordered[Math.floor(ordered.length / 2)];
    }
    return ordered[0];
};
// ── FmServiceCore ────────────────────────────────────────────────────────
/**
 * Database-agnostic FM service core.
 *
 * Orchestrates uploads (direct + proxied), variant management, archive/restore,
 * delete, move, link management, URL resolution, and content streaming.
 * Delegates persistence to an {@link FmConnector} and object I/O to an
 * {@link FmStorageAdapter}.
 */
export class FmServiceCore {
    cfg;
    connector;
    storage;
    onWrite;
    constructor(init) {
        this.cfg = init.config;
        this.connector = init.connector;
        this.storage = init.storage;
        this.onWrite = init.onWrite;
    }
    // ── Accessors ──────────────────────────────────────────────────────
    /** The underlying FmConnector. */
    getConnector() {
        return this.connector;
    }
    /** The underlying FmStorageAdapter. */
    getStorage() {
        return this.storage;
    }
    /** The parsed FmServerConfig. */
    getConfig() {
        return this.cfg;
    }
    // ── Post-write hook (best-effort) ──────────────────────────────────
    async emitWrite(event) {
        if (!this.onWrite) {
            return;
        }
        try {
            await this.onWrite(event);
        }
        catch {
            // best-effort: swallow hook errors
        }
    }
    // ── Upload Init ────────────────────────────────────────────────────
    async uploadInit(input) {
        const parsed = FmUploadInitRequestSchema.parse(input.request);
        const purpose = (parsed.purpose || "generic");
        const validation = validateFmUploadInputs({
            purpose,
            originalFilename: parsed.originalFilename,
            mimeType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
        });
        const caps = this.storage.getCapabilities();
        const defaultBucket = resolveBucketForPurpose(this.cfg, purpose);
        let bucket = defaultBucket;
        const presets = getFmUploadPathPresetsFromConfig(this.cfg);
        const allowedBuckets = new Set(presets.map((p) => p.relativePath));
        const uid = nanoid();
        const objectKey = buildFmObjectKey({
            uid,
            ext: validation.ext,
            folderPath: parsed.folderPath,
        });
        // Defensive: destinationHint must not override server-selected values in v1
        if (parsed.destinationHint?.bucket &&
            parsed.destinationHint.bucket !== defaultBucket) {
            const hintedBucket = String(parsed.destinationHint.bucket).trim();
            if (!allowedBuckets.has(hintedBucket)) {
                throw new FmPolicyError("destinationHint.bucket not allowed");
            }
            bucket = hintedBucket;
        }
        if (parsed.destinationHint?.prefix) {
            const hintedPrefix = sanitizeFmFolderPath(parsed.destinationHint.prefix);
            const actualPrefix = sanitizeFmFolderPath(parsed.folderPath);
            if (hintedPrefix && actualPrefix && hintedPrefix !== actualPrefix) {
                throw new FmPolicyError("destinationHint.prefix not allowed");
            }
        }
        const resolvedObject = { bucket, objectKey };
        const storageKey = encodeFmStorageKey(resolvedObject);
        const storageLocation = this.storage.getProvider();
        const isPublic = resolveVisibility(parsed.visibility);
        const objectMetadata = buildFmObjectMetadataForInit({
            fileUid: uid,
            purpose,
            originalFilename: parsed.originalFilename,
            visibility: isPublic ? "public" : "private",
            mimeType: validation.normalizedMimeType,
        });
        const created = await this.connector.insertFile({
            uid,
            owner_user_uid: input.ownerUserUid || null,
            created_by: input.createdBy || null,
            original_filename: parsed.originalFilename,
            mime_type: validation.normalizedMimeType,
            byte_size: parsed.sizeBytes,
            storage_location: storageLocation,
            storage_key: storageKey,
            is_public: isPublic,
            purpose: purpose,
            sha256: "",
        });
        if (!created?.uid) {
            throw new FmStorageError("Failed to create fm_files placeholder row");
        }
        const response = {
            fileUid: uid,
            mode: caps.presignPut ? "direct" : "proxied",
            object: resolvedObject,
        };
        if (caps.presignPut && this.storage.presignPut) {
            response.presignedPut = await this.storage.presignPut({
                ref: resolvedObject,
                contentType: validation.normalizedMimeType,
                contentLengthBytes: parsed.sizeBytes,
                metadata: objectMetadata,
                expiresInSeconds: getSignedUrlTtlSeconds(this.cfg),
            });
        }
        return response;
    }
    // ── Upload Finalize ────────────────────────────────────────────────
    /**
     * Finalize a file upload after the client has written the object.
     *
     * Verifies the uploaded object exists in storage, confirms the object
     * reference matches the init record, performs MIME sniffing + image
     * dimension extraction, computes SHA-256 (local storage), and updates
     * the `fm_files` row with the finalized metadata.
     *
     * @param input.request - Finalize request containing file UID and object ref.
     * @returns The finalized file row.
     * @throws {FmNotFoundError} If the file or uploaded object is not found.
     * @throws {FmValidationError} If the finalize object ref does not match init.
     * @throws {FmStorageError} If the storage adapter lacks headObject capability.
     */
    async uploadFinalize(input) {
        const parsed = FmUploadFinalizeRequestSchema.parse(input.request);
        const caps = this.storage.getCapabilities();
        if (!caps.headObject || !this.storage.headObject) {
            throw new FmStorageError("Storage adapter does not support headObject");
        }
        const existing = await this.connector.getFileByUid(parsed.fileUid);
        if (!existing) {
            throw new FmNotFoundError("File", parsed.fileUid);
        }
        // Ensure finalize matches the object reference we issued on init
        const expectedRef = decodeFmStorageKey(existing.storage_key);
        if (expectedRef.bucket !== parsed.object.bucket ||
            expectedRef.objectKey !== parsed.object.objectKey) {
            throw new FmValidationError("Finalize object mismatch");
        }
        const head = await this.storage.headObject({ ref: parsed.object });
        if (!head.exists) {
            throw new FmNotFoundError("Uploaded object", parsed.object.objectKey);
        }
        let sha256;
        let sniffedMime = null;
        if (this.storage.getProvider() === "local") {
            const uploadRootAbsPath = resolveFmLocalUploadRootAbsPath(this.cfg);
            sha256 = await computeLocalSha256Hex({
                dataRootAbsPath: uploadRootAbsPath,
                ref: parsed.object,
            });
            sniffedMime = await sniffLocalMimeType({
                dataRootAbsPath: uploadRootAbsPath,
                ref: parsed.object,
            });
        }
        else if (parsed.sha256) {
            sha256 = parsed.sha256;
        }
        const patch = {
            byte_size: head.sizeBytes || existing.byte_size,
            sha256: sha256 || existing.sha256,
            mime_type: sniffedMime || head.contentType || existing.mime_type,
            updated_at: new Date().toISOString(),
        };
        const updated = await this.connector.updateFileByUid(parsed.fileUid, patch);
        const variants = await this.connector.listVariantsForFile(parsed.fileUid);
        const resp = {
            file: (updated || existing),
        };
        if (variants?.length) {
            resp.variants = variants;
        }
        await this.emitWrite({
            action: "upload",
            fileUid: parsed.fileUid,
            userUid: existing.owner_user_uid || "",
        });
        return resp;
    }
    // ── Upload Write + Finalize (proxied) ──────────────────────────────
    /**
     * Proxied upload: write the request body to storage and finalize in one step.
     *
     * Used when the client cannot upload directly (no presigned URL support).
     * Writes the body via the storage adapter, then delegates to
     * {@link uploadFinalize} for verification and metadata updates.
     *
     * @param input.fileUid - UID of the file (from uploadInit).
     * @param input.body - Raw file bytes.
     * @param input.contentType - Optional MIME type override.
     * @returns The finalized file row.
     * @throws {FmNotFoundError} If the file record is not found.
     * @throws {FmValidationError} If the body exceeds the declared size or file is archived.
     * @throws {FmStorageError} If the storage adapter lacks writeObject/headObject capability.
     */
    async uploadWriteAndFinalize(input) {
        const caps = this.storage.getCapabilities();
        if (!caps.writeObject || !this.storage.writeObject) {
            throw new FmStorageError("Storage adapter does not support writeObject");
        }
        if (!caps.headObject || !this.storage.headObject) {
            throw new FmStorageError("Storage adapter does not support headObject");
        }
        const existing = await this.connector.getFileByUid(input.fileUid);
        if (!existing) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        if (existing.archived_at) {
            throw new FmValidationError("Cannot upload to archived file");
        }
        const expectedRef = decodeFmStorageKey(existing.storage_key);
        const actualSize = Buffer.isBuffer(input.body)
            ? input.body.length
            : input.body.byteLength;
        if (Number.isFinite(existing.byte_size) && existing.byte_size >= 0) {
            if (actualSize > existing.byte_size) {
                throw new FmValidationError("Upload exceeds declared size");
            }
        }
        try {
            const objectMetadata = buildFmObjectMetadataForExistingFile({
                file: {
                    uid: existing.uid,
                    original_filename: existing.original_filename,
                    is_public: Boolean(existing.is_public),
                    mime_type: existing.mime_type,
                },
            });
            await this.storage.writeObject({
                ref: expectedRef,
                body: input.body,
                contentType: input.contentType || existing.mime_type || undefined,
                metadata: objectMetadata,
            });
            return await this.uploadFinalize({
                request: {
                    fileUid: input.fileUid,
                    object: expectedRef,
                },
            });
        }
        catch (err) {
            if (caps.deleteObject && this.storage.deleteObject) {
                try {
                    await this.storage.deleteObject({ ref: expectedRef });
                }
                catch {
                    // swallow cleanup errors; we want the original error context
                }
            }
            throw err;
        }
    }
    // ── Variant Upload Init ────────────────────────────────────────────
    /**
     * Initiate a variant upload for an existing file.
     *
     * Creates a variant record in the database, resolves the storage path
     * relative to the parent file, and returns either a presigned PUT URL
     * or signals proxied mode.
     *
     * @param input.request - Variant upload init request (parent UID, kind, dimensions, etc.).
     * @returns Variant init response with variant UID, upload mode, object ref, and optional presigned URL.
     * @throws {FmNotFoundError} If the parent file is not found.
     * @throws {FmValidationError} If the parent file is archived or purpose mismatches.
     * @throws {FmPolicyError} If the variant violates upload policy.
     */
    async variantUploadInit(input) {
        const parsed = FmVariantUploadInitRequestSchema.parse(input.request);
        const file = await this.connector.getFileByUid(parsed.variantOfUid);
        if (!file) {
            throw new FmNotFoundError("Parent file", parsed.variantOfUid);
        }
        if (file.archived_at) {
            throw new FmValidationError("Cannot add variants to archived file");
        }
        // Accept purpose explicitly, not derived from parent
        const purpose = file.purpose || parsed.purpose || "cms_asset";
        if (parsed.purpose && parsed.purpose !== purpose) {
            throw new FmValidationError("Variant purpose mismatch");
        }
        const validation = validateFmUploadInputs({
            purpose,
            originalFilename: parsed.originalFilename,
            mimeType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
        });
        const variantUid = nanoid();
        const caps = this.storage.getCapabilities();
        const parentRef = decodeFmStorageKey(file.storage_key);
        const parentDir = parentRef.objectKey.includes("/")
            ? parentRef.objectKey.split("/").slice(0, -1).join("/")
            : "";
        const objectKey = parentDir
            ? `${parentDir}/${variantUid}.${validation.ext}`
            : `${variantUid}.${validation.ext}`;
        const ref = { bucket: parentRef.bucket, objectKey };
        const expectedWidth = clampPositiveInt(parsed.width);
        const expectedHeight = clampPositiveInt(parsed.height);
        validateVariantKindAndTarget({
            variantKind: parsed.variantKind,
            width: expectedWidth,
            height: expectedHeight,
        });
        const storageKey = encodeFmStorageKey(ref);
        const storageLocation = this.storage.getProvider();
        const transform = (parsed.transform || {});
        await this.connector.insertVariant({
            uid: variantUid,
            variant_of_uid: parsed.variantOfUid,
            variant_kind: parsed.variantKind,
            width: expectedWidth ?? null,
            height: expectedHeight ?? null,
            transform,
            storage_location: storageLocation,
            storage_key: storageKey,
            byte_size: parsed.sizeBytes,
            mime_type: validation.normalizedMimeType,
        });
        const response = {
            variantUid,
            mode: caps.presignPut ? "direct" : "proxied",
            object: ref,
        };
        if (caps.presignPut && this.storage.presignPut) {
            const objectMetadata = {
                "fm-variant-of": parsed.variantOfUid,
                "fm-variant-kind": parsed.variantKind,
                "fm-uid": variantUid,
            };
            response.presignedPut = await this.storage.presignPut({
                ref,
                contentType: validation.normalizedMimeType,
                contentLengthBytes: parsed.sizeBytes,
                metadata: objectMetadata,
                expiresInSeconds: getSignedUrlTtlSeconds(this.cfg),
            });
        }
        return response;
    }
    // ── Variant Upload Finalize ────────────────────────────────────────
    /**
     * Finalize a variant upload after the client has written the object.
     *
     * Verifies the uploaded object exists, performs MIME sniffing and image
     * dimension validation (with tolerance), and updates the variant row.
     *
     * @param input.request - Finalize request containing variant UID and object ref.
     * @returns The finalized variant row.
     * @throws {FmNotFoundError} If the variant or uploaded object is not found.
     * @throws {FmValidationError} If object ref mismatches or dimensions exceed tolerance.
     * @throws {FmStorageError} If the storage adapter lacks headObject capability.
     */
    async variantUploadFinalize(input) {
        const parsed = FmVariantUploadFinalizeRequestSchema.parse(input.request);
        const caps = this.storage.getCapabilities();
        if (!caps.headObject || !this.storage.headObject) {
            throw new FmStorageError("Storage adapter does not support headObject");
        }
        const variant = await this.connector.getVariantByUid(parsed.variantUid);
        if (!variant) {
            throw new FmNotFoundError("Variant", parsed.variantUid);
        }
        const expectedRef = decodeFmStorageKey(variant.storage_key);
        if (expectedRef.bucket !== parsed.object.bucket ||
            expectedRef.objectKey !== parsed.object.objectKey) {
            throw new FmValidationError("Finalize object mismatch");
        }
        const head = await this.storage.headObject({ ref: parsed.object });
        if (!head.exists) {
            throw new FmNotFoundError("Uploaded object", parsed.object.objectKey);
        }
        const patch = {
            byte_size: head.sizeBytes || variant.byte_size,
            mime_type: head.contentType || variant.mime_type,
        };
        // Defensive: sniff + dimensions validation (best-effort).
        if (caps.readObjectRange && this.storage.readObjectRange) {
            const header = await readObjectHeaderBytes({
                adapter: this.storage,
                ref: parsed.object,
                maxBytes: 64 * 1024,
            });
            const sniffed = sniffMimeFromHeader(header);
            if (sniffed && sniffed.startsWith("image/")) {
                patch.mime_type = sniffed;
                const dims = extractImageDimensionsFromHeader({
                    headerBytes: header,
                    mimeType: sniffed,
                });
                if (dims) {
                    patch.width = dims.width;
                    patch.height = dims.height;
                    const expectedW = typeof variant.width === "number" ? variant.width : null;
                    const expectedH = typeof variant.height === "number" ? variant.height : null;
                    const TOL = 2;
                    if (expectedW && Math.abs(dims.width - expectedW) > TOL) {
                        throw new FmValidationError("Variant width mismatch");
                    }
                    if (expectedH && Math.abs(dims.height - expectedH) > TOL) {
                        throw new FmValidationError("Variant height mismatch");
                    }
                }
            }
        }
        const updated = await this.connector.updateVariantByUid(parsed.variantUid, patch);
        await this.emitWrite({
            action: "variant-upload",
            fileUid: variant.variant_of_uid,
            userUid: "",
        });
        return { variant: (updated || variant) };
    }
    // ── Variant Upload Write + Finalize (proxied) ──────────────────────
    /**
     * Proxied variant upload: write the body to storage and finalize in one step.
     *
     * @param input.variantUid - UID of the variant (from variantUploadInit).
     * @param input.body - Raw variant bytes.
     * @param input.contentType - Optional MIME type override.
     * @returns The finalized variant row.
     * @throws {FmNotFoundError} If the variant record is not found.
     * @throws {FmValidationError} If the body exceeds the declared size.
     * @throws {FmStorageError} If the storage adapter lacks writeObject capability.
     */
    async variantUploadWriteAndFinalize(input) {
        const caps = this.storage.getCapabilities();
        if (!caps.writeObject || !this.storage.writeObject) {
            throw new FmStorageError("Storage adapter does not support writeObject");
        }
        const variant = await this.connector.getVariantByUid(input.variantUid);
        if (!variant) {
            throw new FmNotFoundError("Variant", input.variantUid);
        }
        const expectedRef = decodeFmStorageKey(variant.storage_key);
        const actualSize = Buffer.isBuffer(input.body)
            ? input.body.length
            : input.body.byteLength;
        if (Number.isFinite(variant.byte_size) && variant.byte_size >= 0) {
            if (actualSize > variant.byte_size) {
                throw new FmValidationError("Upload exceeds declared size");
            }
        }
        try {
            await this.storage.writeObject({
                ref: expectedRef,
                body: input.body,
                contentType: input.contentType || variant.mime_type || undefined,
                metadata: {
                    "fm-variant-of": variant.variant_of_uid,
                    "fm-variant-kind": variant.variant_kind,
                    "fm-uid": variant.uid,
                },
            });
            return await this.variantUploadFinalize({
                request: {
                    variantUid: variant.uid,
                    object: expectedRef,
                },
            });
        }
        catch (err) {
            if (caps.deleteObject && this.storage.deleteObject) {
                try {
                    await this.storage.deleteObject({ ref: expectedRef });
                }
                catch {
                    // ignore cleanup errors
                }
            }
            throw err;
        }
    }
    // ── Storage Object Metadata ────────────────────────────────────────
    /**
     * Read storage-level metadata for a file or one of its variants.
     *
     * For S3 objects this returns the custom metadata headers; for local
     * storage it checks file existence and size.
     *
     * @param input.fileUid - File UID to look up.
     * @param input.variantKind - Optional variant kind ("thumb", "web", "preview").
     * @returns The metadata key-value pairs from the storage object.
     * @throws {FmNotFoundError} If the file or storage object is not found.
     * @throws {FmStorageError} If the storage adapter lacks headObject capability.
     */
    async getStorageObjectMetadata(input) {
        const caps = this.storage.getCapabilities();
        if (!caps.headObject || !this.storage.headObject) {
            throw new FmStorageError("Storage adapter does not support headObject");
        }
        const file = await this.connector.getFileByUid(input.fileUid);
        if (!file) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        let ref = decodeFmStorageKey(file.storage_key);
        if (input.variantKind) {
            const variants = await this.connector.listVariantsForFile(input.fileUid);
            const v = pickVariant(variants, input.variantKind);
            if (v) {
                ref = decodeFmStorageKey(v.storage_key);
            }
        }
        const head = await this.storage.headObject({ ref });
        if (!head.exists) {
            throw new FmNotFoundError("Object", ref.objectKey);
        }
        return { metadata: head.metadata || {} };
    }
    // ── URL Resolution ─────────────────────────────────────────────────
    /**
     * Resolve a read URL for a file (with optional variant).
     *
     * URL resolution strategy:
     * 1. Public files: direct S3 public URL (if supported) or canonical `/media/:uid` URL.
     * 2. Private files: presigned GET URL (if supported) or canonical URL as fallback.
     *
     * @param input.fileUid - File UID to resolve.
     * @param input.variantKind - Optional variant kind to resolve instead of the main file.
     * @param input.req - Express-like request for building canonical URLs.
     * @param input.expiresInSeconds - TTL override for presigned URLs.
     * @returns Object with `url`, `kind` ("public" | "signed" | "canonical"), and optional `expiresAtIso`.
     * @throws {FmNotFoundError} If the file is not found.
     */
    async resolveReadUrl(input) {
        const caps = this.storage.getCapabilities();
        const file = await this.connector.getFileByUid(input.fileUid);
        if (!file) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        let ref = decodeFmStorageKey(file.storage_key);
        if (input.variantKind) {
            const variants = await this.connector.listVariantsForFile(input.fileUid);
            const v = pickVariant(variants, input.variantKind);
            if (v) {
                ref = decodeFmStorageKey(v.storage_key);
            }
        }
        // Public assets
        if (file.is_public && !file.archived_at) {
            if (caps.publicUrl && this.storage.getPublicUrl) {
                const direct = this.storage.getPublicUrl({ ref });
                if (direct) {
                    return { url: direct, kind: "public" };
                }
            }
            return {
                url: buildCanonicalMediaUrl({
                    uid: input.fileUid,
                    req: input.req,
                    clientUrl: this.cfg.clientUrl,
                }),
                kind: "canonical",
            };
        }
        // Private assets: signed URL when supported, otherwise caller must proxy
        if (caps.presignGet && this.storage.presignGet) {
            const ttl = input.expiresInSeconds || getSignedUrlTtlSeconds(this.cfg);
            const signed = await this.storage.presignGet({
                ref,
                expiresInSeconds: ttl,
                responseContentType: file.mime_type || undefined,
            });
            return {
                url: signed.url,
                kind: "signed",
                expiresAtIso: signed.expiresAtIso,
            };
        }
        return {
            url: buildCanonicalMediaUrl({
                uid: input.fileUid,
                req: input.req,
                clientUrl: this.cfg.clientUrl,
            }),
            kind: "canonical",
        };
    }
    // ── Content Streaming Resolution ───────────────────────────────────
    /**
     * Resolve content access information for a file (with optional variant).
     *
     * Returns the info needed for Express routers to stream content. Does not
     * perform the actual streaming (that's route-layer responsibility).
     */
    async resolveContentAccess(input) {
        const file = await this.connector.getFileByUid(input.fileUid);
        if (!file) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        let ref = decodeFmStorageKey(file.storage_key);
        let contentType = file.mime_type || undefined;
        let usingVariant = false;
        if (input.variantKind) {
            const variants = await this.connector.listVariantsForFile(input.fileUid);
            const v = pickVariant(variants, input.variantKind);
            if (v) {
                ref = decodeFmStorageKey(v.storage_key);
                contentType = v.mime_type || contentType;
                usingVariant = true;
            }
        }
        const provider = this.storage.getProvider();
        if (provider === "local") {
            const uploadRoot = resolveFmLocalUploadRootAbsPath(this.cfg);
            let absPath = path.resolve(uploadRoot, ref.bucket, ref.objectKey);
            // If we resolved a variant but the file doesn't exist on disk,
            // fall back to the original file (same behaviour as legacy fmExtras).
            if (usingVariant && !fs.existsSync(absPath)) {
                const originalRef = decodeFmStorageKey(file.storage_key);
                absPath = path.resolve(uploadRoot, originalRef.bucket, originalRef.objectKey);
                ref = originalRef;
                contentType = file.mime_type || undefined;
            }
            return { provider, ref, file, absPath, contentType };
        }
        // S3: resolve a signed URL for redirect
        const caps = this.storage.getCapabilities();
        if (caps.presignGet && this.storage.presignGet) {
            const ttl = getSignedUrlTtlSeconds(this.cfg);
            const signed = await this.storage.presignGet({
                ref,
                expiresInSeconds: ttl,
                responseContentType: contentType,
            });
            return {
                provider,
                ref,
                file,
                redirectUrl: signed.url,
                contentType,
            };
        }
        // Fallback: no redirect URL (caller must handle proxying)
        return { provider, ref, file, contentType };
    }
    // ── List Files ─────────────────────────────────────────────────────
    /**
     * List files with pagination, filtering, and sorting.
     *
     * @param params - Filter, sort, and pagination parameters.
     * @returns Paginated file listing result.
     */
    async listFiles(params) {
        return await this.connector.listFiles(params);
    }
    // ── Get File ───────────────────────────────────────────────────────
    /**
     * Get a single file by its UID.
     *
     * @param uid - The file UID.
     * @returns The file row, or `null` if not found.
     */
    async getFileByUid(uid) {
        return await this.connector.getFileByUid(uid);
    }
    // ── Archive ────────────────────────────────────────────────────────
    /**
     * Soft-archive a file by setting its `archived_at` timestamp.
     *
     * No-op if the file is already archived.
     *
     * @param input.fileUid - File UID to archive.
     * @param input.userUid - UID of the user performing the action.
     * @returns The updated file row.
     * @throws {FmNotFoundError} If the file is not found.
     */
    async archiveFile(input) {
        const existing = await this.connector.getFileByUid(input.fileUid);
        if (!existing) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        if (existing.archived_at) {
            return existing;
        }
        const updated = await this.connector.updateFileByUid(input.fileUid, {
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        await this.emitWrite({
            action: "archive",
            fileUid: input.fileUid,
            userUid: input.userUid || existing.owner_user_uid || "",
        });
        return (updated || existing);
    }
    // ── Restore ────────────────────────────────────────────────────────
    /**
     * Restore an archived file by clearing its `archived_at` timestamp.
     *
     * No-op if the file is not archived.
     *
     * @param input.fileUid - File UID to restore.
     * @param input.userUid - UID of the user performing the action.
     * @returns The updated file row.
     * @throws {FmNotFoundError} If the file is not found.
     */
    async restoreFile(input) {
        const existing = await this.connector.getFileByUid(input.fileUid);
        if (!existing) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        if (!existing.archived_at) {
            return existing;
        }
        const updated = await this.connector.updateFileByUid(input.fileUid, {
            archived_at: null,
            updated_at: new Date().toISOString(),
        });
        await this.emitWrite({
            action: "restore",
            fileUid: input.fileUid,
            userUid: input.userUid || existing.owner_user_uid || "",
        });
        return (updated || existing);
    }
    // ── Delete ─────────────────────────────────────────────────────────
    /**
     * Delete a file (soft-archive or hard delete).
     *
     * If the file has active links and `force` is not set, the file is
     * soft-archived instead. Hard deletion (`force: true`) requires
     * `isAdmin: true` and removes the file, all variants, and all
     * storage objects permanently.
     *
     * @param input.fileUid - File UID to delete.
     * @param input.force - Hard-delete even if links exist (requires admin).
     * @param input.isAdmin - Whether the caller has admin privileges.
     * @param input.userUid - UID of the user performing the action.
     * @returns A discriminated union: `{ action: "archived" }` or `{ action: "deleted" }`.
     * @throws {FmNotFoundError} If the file is not found.
     * @throws {FmAuthorizationError} If `force` is set without `isAdmin`.
     * @throws {FmStorageError} If storage adapter lacks deleteObject capability.
     */
    async deleteFile(input) {
        const caps = this.storage.getCapabilities();
        const existing = await this.connector.getFileByUid(input.fileUid);
        if (!existing) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        const linkCount = await this.connector.countLinksForFile(input.fileUid);
        if (linkCount > 0 && !input.force) {
            const file = await this.archiveFile({
                fileUid: input.fileUid,
                userUid: input.userUid,
            });
            return { action: "archived", file, linkCount };
        }
        // Defense-in-depth: force delete requires admin
        if (input.force && !input.isAdmin) {
            throw new FmAuthorizationError("Hard delete requires admin + force");
        }
        if (!caps.deleteObject || !this.storage.deleteObject) {
            throw new FmStorageError("Storage adapter does not support deleteObject");
        }
        // Delete objects (variants + main) first; if this fails we keep
        // metadata so callers can retry.
        const variants = await this.connector.listVariantsForFile(input.fileUid);
        const toDelete = [];
        for (const v of variants) {
            try {
                toDelete.push(decodeFmStorageKey(v.storage_key));
            }
            catch {
                // ignore bad variant ref
            }
        }
        try {
            toDelete.push(decodeFmStorageKey(existing.storage_key));
        }
        catch {
            // ignore bad file ref
        }
        let deletedObjects = 0;
        for (const ref of toDelete) {
            await this.storage.deleteObject({ ref });
            deletedObjects += 1;
        }
        // Delete variant rows then file row
        await this.connector.deleteVariantsForFile(input.fileUid);
        await this.connector.deleteFileByUid(input.fileUid);
        await this.emitWrite({
            action: "delete",
            fileUid: input.fileUid,
            userUid: input.userUid || existing.owner_user_uid || "",
        });
        return {
            action: "deleted",
            fileUid: input.fileUid,
            deletedObjects,
        };
    }
    // ── Move ───────────────────────────────────────────────────────────
    /**
     * Move a file (and its variants) to a different bucket or folder.
     *
     * Copies objects to the destination, updates DB storage keys, then
     * best-effort deletes old objects. If cleanup fails, metadata already
     * points at the new location.
     *
     * @param input.fileUid - File UID to move.
     * @param input.toBucket - Destination bucket (must be in allowed presets).
     * @param input.toFolderPath - Destination folder path.
     * @param input.userUid - UID of the user performing the action.
     * @returns The updated file and variant rows.
     * @throws {FmNotFoundError} If the file is not found.
     * @throws {FmValidationError} If the file is archived.
     * @throws {FmPolicyError} If the destination bucket is not allowed.
     * @throws {FmStorageError} If storage lacks copy/delete capabilities.
     */
    async moveFile(input) {
        const caps = this.storage.getCapabilities();
        if (!caps.copyObject || !this.storage.copyObject) {
            throw new FmStorageError("Storage adapter does not support copyObject");
        }
        if (!caps.deleteObject || !this.storage.deleteObject) {
            throw new FmStorageError("Storage adapter does not support deleteObject");
        }
        const file = await this.connector.getFileByUid(input.fileUid);
        if (!file) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        if (file.archived_at) {
            throw new FmValidationError("Cannot move archived file");
        }
        const fromRef = decodeFmStorageKey(file.storage_key);
        const desiredBucket = (input.toBucket || fromRef.bucket).trim();
        if (desiredBucket !== fromRef.bucket) {
            const presets = getFmUploadPathPresetsFromConfig(this.cfg);
            const allowed = new Set(presets.map((p) => p.relativePath));
            if (!allowed.has(desiredBucket)) {
                throw new FmPolicyError("Destination bucket not allowed");
            }
        }
        const filename = getObjectFilename(fromRef.objectKey);
        const toRef = {
            bucket: desiredBucket,
            objectKey: buildMovedObjectKey({
                filename,
                folderPath: input.toFolderPath,
            }),
        };
        const variants = await this.connector.listVariantsForFile(input.fileUid);
        const variantMoves = [];
        for (const v of variants) {
            const vFrom = decodeFmStorageKey(v.storage_key);
            const vFilename = getObjectFilename(vFrom.objectKey);
            variantMoves.push({
                uid: v.uid,
                from: vFrom,
                to: {
                    bucket: desiredBucket,
                    objectKey: buildMovedObjectKey({
                        filename: vFilename,
                        folderPath: input.toFolderPath,
                    }),
                },
            });
        }
        // 1) Copy objects to destination
        await this.storage.copyObject({ from: fromRef, to: toRef });
        for (const vm of variantMoves) {
            await this.storage.copyObject({ from: vm.from, to: vm.to });
        }
        // 2) Update metadata to new storage keys
        const updatedFile = await this.connector.updateFileByUid(input.fileUid, {
            storage_key: encodeFmStorageKey(toRef),
            updated_at: new Date().toISOString(),
        });
        const updatedVariants = [];
        for (const vm of variantMoves) {
            const updatedVariant = await this.connector.updateVariantByUid(vm.uid, {
                storage_key: encodeFmStorageKey(vm.to),
            });
            if (updatedVariant) {
                updatedVariants.push(updatedVariant);
            }
        }
        // 3) Best-effort delete old objects (non-fatal if cleanup fails)
        try {
            for (const vm of variantMoves) {
                await this.storage.deleteObject({ ref: vm.from });
            }
            await this.storage.deleteObject({ ref: fromRef });
        }
        catch {
            // ignore cleanup failures; metadata now points at the new objects
        }
        await this.emitWrite({
            action: "move",
            fileUid: input.fileUid,
            userUid: input.userUid || file.owner_user_uid || "",
            metadata: {
                fromBucket: fromRef.bucket,
                toBucket: toRef.bucket,
                toFolder: input.toFolderPath,
            },
        });
        return {
            file: (updatedFile || file),
            variants: updatedVariants,
        };
    }
    // ── Link Management ────────────────────────────────────────────────
    async createLink(input) {
        const file = await this.connector.getFileByUid(input.file_uid);
        if (!file) {
            throw new FmNotFoundError("File", input.file_uid);
        }
        return await this.connector.createLink(input);
    }
    /**
     * Delete a link between a file and an external entity.
     *
     * @param input.fileUid - File UID.
     * @param input.linkedEntityType - Entity type.
     * @param input.linkedEntityUid - Entity UID.
     */
    async deleteLink(input) {
        await this.connector.deleteLink(input);
    }
    /**
     * List links for a file with optional pagination.
     *
     * @param fileUid - File UID.
     * @param params - Optional filter and pagination parameters.
     * @returns Paginated link listing result.
     */
    async listLinksForFile(fileUid, params) {
        return await this.connector.listLinksForFile(fileUid, params);
    }
    // ── Metadata Patching ──────────────────────────────────────────────
    /**
     * Patch file metadata (title, alt_text, tags, is_public).
     *
     * Business rules:
     * - Local storage forces is_public=true (no presigned URLs for local files)
     * - Tags are normalized (trimmed, deduplicated)
     * - Only whitelisted fields are updateable
     */
    async patchFile(input) {
        const existing = await this.connector.getFileByUid(input.fileUid);
        if (!existing) {
            throw new FmNotFoundError("File", input.fileUid);
        }
        const safePatch = {};
        if (input.patch.title !== undefined) {
            safePatch.title = String(input.patch.title).trim();
        }
        if (input.patch.alt_text !== undefined) {
            safePatch.alt_text = String(input.patch.alt_text).trim();
        }
        if (input.patch.tags !== undefined) {
            safePatch.tags = [
                ...new Set((input.patch.tags || []).map((t) => String(t).trim()).filter(Boolean)),
            ];
        }
        if (input.patch.is_public !== undefined) {
            let isPublic = Boolean(input.patch.is_public);
            // Local storage: force public (no presigned URLs)
            if (this.storage.getProvider() === "local") {
                isPublic = true;
            }
            safePatch.is_public = isPublic;
        }
        if (Object.keys(safePatch).length === 0) {
            return existing;
        }
        safePatch.updated_at = new Date().toISOString();
        const updated = await this.connector.updateFileByUid(input.fileUid, safePatch);
        return (updated || existing);
    }
    // ── List Variants ──────────────────────────────────────────────────
    /**
     * List all variants for a file.
     *
     * @param fileUid - File UID.
     * @returns Array of variant rows.
     */
    async listVariantsForFile(fileUid) {
        return await this.connector.listVariantsForFile(fileUid);
    }
}
//# sourceMappingURL=FmServiceCore.js.map