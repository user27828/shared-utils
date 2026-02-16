/**
 * FM S3-Compatible Storage Adapter — shared-utils
 *
 * Storage adapter for S3-compatible object storage (AWS S3, Cloudflare R2,
 * MinIO, etc.) using @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
 *
 * IMPORTANT: This file uses static imports of @aws-sdk packages. It is
 * intentionally NOT re-exported from the storage barrel to avoid forcing
 * the AWS SDK dependency on consumers who only use local storage.
 *
 * Consumers who need S3:
 *   - Import directly: `import { FmStorageS3 } from "@user27828/shared-utils/fm/server/s3"`
 *   - Or use the async factory: `createFmStorage(config)` which dynamically imports this module
 *
 * @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner are listed as optional
 * peer dependencies in shared-utils package.json.
 *
 * Extracted from: db-supabase/server/fm/storage/FmStorageS3.ts
 */
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, CopyObjectCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// ── Helpers ──────────────────────────────────────────────────────────────
const resolvePublicUrl = (baseUrl, ref) => {
    // Supports simple templating to avoid hardcoding a single URL shape:
    // - {bucket} and {key} tokens are replaced when present
    // - otherwise we append /{bucket}/{key}
    const trimmed = baseUrl.replace(/\/+$/, "");
    if (trimmed.includes("{bucket}") || trimmed.includes("{key}")) {
        // Avoid String.prototype.replaceAll for ES2020 compatibility
        const bucketEsc = encodeURIComponent(ref.bucket);
        const keyEsc = ref.objectKey.split("/").map(encodeURIComponent).join("/");
        return trimmed
            .split("{bucket}")
            .join(bucketEsc)
            .split("{key}")
            .join(keyEsc);
    }
    return `${trimmed}/${encodeURIComponent(ref.bucket)}/${ref.objectKey
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;
};
// ── Adapter ──────────────────────────────────────────────────────────────
/**
 * S3-compatible object storage adapter.
 *
 * Supports presigned uploads/downloads, head, read range, write, delete,
 * copy, and optional public URL generation.
 */
export class FmStorageS3 {
    client;
    publicBaseUrl;
    constructor(params) {
        this.client = new S3Client({
            region: params.region || "auto",
            endpoint: params.endpoint,
            forcePathStyle: typeof params.forcePathStyle === "boolean"
                ? params.forcePathStyle
                : true,
            credentials: {
                accessKeyId: params.accessKeyId,
                secretAccessKey: params.secretAccessKey,
            },
        });
        this.publicBaseUrl = params.publicBaseUrl;
    }
    /** @returns `"s3"` provider identifier. */
    getProvider() {
        return "s3";
    }
    /** @returns Capability flags for S3 storage (all capabilities supported). */
    getCapabilities() {
        return {
            presignPut: true,
            presignGet: true,
            headObject: true,
            readObjectRange: true,
            // Allow server-proxied uploads as a fallback (bandwidth-heavy but sometimes necessary).
            writeObject: true,
            deleteObject: true,
            copyObject: true,
            publicUrl: Boolean(this.publicBaseUrl),
        };
    }
    /** Read a byte range from an S3 object via the Range header. */
    async readObjectRange(input) {
        const start = Math.max(0, Math.floor(input.start));
        const endInclusive = Math.max(start, Math.floor(input.endInclusive));
        const res = await this.client.send(new GetObjectCommand({
            Bucket: input.ref.bucket,
            Key: input.ref.objectKey,
            Range: `bytes=${start}-${endInclusive}`,
        }));
        const body = res.Body;
        if (!body) {
            return Buffer.alloc(0);
        }
        // In Node.js, AWS SDK returns a readable stream.
        if (typeof body.transformToByteArray === "function") {
            const bytes = await body.transformToByteArray();
            return Buffer.from(bytes);
        }
        const stream = body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    /** Generate a presigned PUT URL for direct client-side uploads. */
    async presignPut(input) {
        const cmd = new PutObjectCommand({
            Bucket: input.ref.bucket,
            Key: input.ref.objectKey,
            ContentType: input.contentType,
            Metadata: input.metadata,
            // ContentLength is not supported on all S3-compatible providers for signing constraints;
            // keep as metadata only.
        });
        const url = await getSignedUrl(this.client, cmd, {
            expiresIn: input.expiresInSeconds,
        });
        const headers = {};
        if (input.contentType) {
            // When content-type is part of the signed request, the client must send it.
            headers["content-type"] = input.contentType;
        }
        if (input.metadata) {
            for (const [k, v] of Object.entries(input.metadata)) {
                if (!k) {
                    continue;
                }
                // S3 metadata is transmitted via x-amz-meta-* headers.
                headers[`x-amz-meta-${k}`] = v;
            }
        }
        const hasHeaders = Object.keys(headers).length > 0;
        return {
            method: "PUT",
            url,
            headers: hasHeaders ? headers : undefined,
            expiresAtIso: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
        };
    }
    /** Generate a presigned GET URL for time-limited downloads. */
    async presignGet(input) {
        const cmd = new GetObjectCommand({
            Bucket: input.ref.bucket,
            Key: input.ref.objectKey,
            ResponseContentDisposition: input.responseContentDisposition,
            ResponseContentType: input.responseContentType,
        });
        const url = await getSignedUrl(this.client, cmd, {
            expiresIn: input.expiresInSeconds,
        });
        return {
            url,
            expiresAtIso: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
        };
    }
    /** Write an object via PutObject (server-proxied upload). */
    async writeObject(input) {
        await this.client.send(new PutObjectCommand({
            Bucket: input.ref.bucket,
            Key: input.ref.objectKey,
            Body: input.body,
            ContentType: input.contentType,
            Metadata: input.metadata,
        }));
    }
    /** Check if an object exists and return its metadata. */
    async headObject(input) {
        try {
            const res = await this.client.send(new HeadObjectCommand({
                Bucket: input.ref.bucket,
                Key: input.ref.objectKey,
            }));
            return {
                exists: true,
                sizeBytes: typeof res.ContentLength === "number" ? res.ContentLength : undefined,
                contentType: res.ContentType,
                etag: res.ETag,
                lastModifiedIso: res.LastModified?.toISOString(),
                metadata: res.Metadata || undefined,
            };
        }
        catch (e) {
            const name = e?.name || e?.Code || e?.code;
            if (name === "NotFound" || e?.$metadata?.httpStatusCode === 404) {
                return { exists: false };
            }
            throw e;
        }
    }
    /** Delete an object via DeleteObject. */
    async deleteObject(input) {
        await this.client.send(new DeleteObjectCommand({
            Bucket: input.ref.bucket,
            Key: input.ref.objectKey,
        }));
    }
    /** Copy an object to a new location, preserving metadata. */
    async copyObject(input) {
        // CopySource must be URL-encoded in AWS, but most S3-compatible providers accept raw.
        // Use the safe AWS format.
        const copySource = `${encodeURIComponent(input.from.bucket)}/${input.from.objectKey
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`;
        await this.client.send(new CopyObjectCommand({
            Bucket: input.to.bucket,
            Key: input.to.objectKey,
            CopySource: copySource,
            // Preserve existing metadata (x-amz-meta-*) when moving/copying objects.
            // Many providers default to COPY, but make it explicit to avoid drift.
            MetadataDirective: "COPY",
        }));
    }
    /** Build a public URL for the object using the configured base URL. */
    getPublicUrl(input) {
        if (!this.publicBaseUrl) {
            return null;
        }
        return resolvePublicUrl(this.publicBaseUrl, input.ref);
    }
}
//# sourceMappingURL=FmStorageS3.js.map