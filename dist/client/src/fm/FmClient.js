// ─── Error class ──────────────────────────────────────────────────────────
/**
 * Error thrown by {@link FmClient} when an API call fails.
 * Carries HTTP `statusCode` and optional machine-readable `code`.
 */
export class FmClientError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = "FmClientError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
const withParams = (base, params) => {
    const url = new URL(base, "http://placeholder");
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
            url.searchParams.set(k, String(v));
        }
    }
    return `${url.pathname}${url.search}`;
};
// ─── Client ───────────────────────────────────────────────────────────────
/**
 * Default {@link FmApi} implementation using `fetch()` (with XHR fallback
 * for upload progress tracking).
 *
 * Handles the full admin surface: upload lifecycle, CRUD, archive/restore,
 * move, variants, links, and synchronous URL builders for content delivery.
 */
export class FmClient {
    constructor(config) {
        this.adminBaseUrl = (config?.adminBaseUrl ?? "/api/fm").replace(/\/+$/, "");
        this.contentBaseUrl = (config?.contentBaseUrl ?? this.adminBaseUrl).replace(/\/+$/, "");
        this.publicBaseUrl = (config?.publicBaseUrl ?? "/media").replace(/\/+$/, "");
        this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
    }
    // ─── Internal fetch helpers ─────────────────────────────────────────
    /**
     * Low-level request that parses JSON and throws FmClientError on failure.
     */
    async request(url, opts) {
        const resp = await this.fetchFn(url, opts);
        const text = await resp.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            throw new FmClientError(text || resp.statusText, resp.status);
        }
        if (!resp.ok) {
            throw new FmClientError(json?.message || resp.statusText, resp.status, json?.code);
        }
        return json;
    }
    /**
     * Admin request with envelope unwrapping.
     * Automatically sets credentials: "include" and Content-Type: "application/json".
     */
    async adminRequest(path, opts) {
        const envelope = await this.request(`${this.adminBaseUrl}${path}`, {
            credentials: "include",
            ...opts,
            headers: {
                "Content-Type": "application/json",
                ...opts?.headers,
            },
        });
        if (!envelope.success) {
            throw new FmClientError(envelope.message || "Request failed");
        }
        return envelope.data;
    }
    /**
     * Raw-body admin request (for proxy uploads).
     * Does NOT set Content-Type: application/json — caller supplies the body's type.
     */
    async adminRawRequest(path, body, contentType, onProgress) {
        // When a progress callback is provided and XMLHttpRequest is available,
        // use XHR to get upload progress events (fetch() doesn't support this).
        if (onProgress && typeof XMLHttpRequest !== "undefined") {
            return this.adminRawRequestXhr(path, body, contentType, onProgress);
        }
        const headers = {};
        if (contentType) {
            headers["Content-Type"] = contentType;
        }
        const envelope = await this.request(`${this.adminBaseUrl}${path}`, {
            method: "POST",
            credentials: "include",
            headers,
            body: body,
        });
        if (!envelope.success) {
            throw new FmClientError(envelope.message || "Upload failed");
        }
        return envelope.data;
    }
    /**
     * XHR-based raw upload with progress tracking.
     * Used when onUploadProgress is provided (fetch doesn't support upload progress).
     */
    adminRawRequestXhr(path, body, contentType, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `${this.adminBaseUrl}${path}`;
            xhr.open("POST", url, true);
            xhr.withCredentials = true;
            if (contentType) {
                xhr.setRequestHeader("Content-Type", contentType);
            }
            xhr.upload.addEventListener("progress", (evt) => {
                if (evt.lengthComputable && onProgress) {
                    onProgress({ loaded: evt.loaded, total: evt.total });
                }
            });
            xhr.addEventListener("load", () => {
                let json;
                try {
                    json = JSON.parse(xhr.responseText);
                }
                catch {
                    reject(new FmClientError(xhr.responseText || xhr.statusText, xhr.status));
                    return;
                }
                if (xhr.status >= 400 || !json.success) {
                    reject(new FmClientError(json.message || xhr.statusText, xhr.status, json.code));
                    return;
                }
                resolve(json.data);
            });
            xhr.addEventListener("error", () => {
                reject(new FmClientError("Network error during upload", 0));
            });
            xhr.addEventListener("abort", () => {
                reject(new FmClientError("Upload aborted", 0));
            });
            const xhrBody = body instanceof Uint8Array ? Uint8Array.from(body).buffer : body;
            xhr.send(xhrBody);
        });
    }
    // ─── Upload ─────────────────────────────────────────────────────────
    async uploadInit(input) {
        return this.adminRequest("/upload/init", {
            method: "POST",
            body: JSON.stringify(input.request),
        });
    }
    async uploadFinalize(input) {
        return this.adminRequest("/upload/finalize", {
            method: "POST",
            body: JSON.stringify({
                fileUid: input.fileUid,
                object: input.object,
            }),
        });
    }
    async uploadProxied(input) {
        return this.adminRawRequest(`/upload/${encodeURIComponent(input.fileUid)}/proxy`, input.body, input.contentType, input.onUploadProgress);
    }
    // ─── Variant upload ─────────────────────────────────────────────────
    async variantUploadInit(input) {
        return this.adminRequest("/variants/upload/init", {
            method: "POST",
            body: JSON.stringify(input.request),
        });
    }
    async variantUploadFinalize(input) {
        return this.adminRequest("/variants/upload/finalize", {
            method: "POST",
            body: JSON.stringify({
                variantUid: input.variantUid,
                object: input.object,
            }),
        });
    }
    async variantUploadProxied(input) {
        return this.adminRawRequest(`/variants/upload/${encodeURIComponent(input.variantUid)}/proxy`, input.body, input.contentType, input.onUploadProgress);
    }
    // ─── File CRUD ──────────────────────────────────────────────────────
    async listFiles(params) {
        const path = withParams("", {
            search: params?.search,
            limit: params?.limit,
            offset: params?.offset,
            includeArchived: params?.includeArchived,
            isPublic: params?.isPublic,
            orderBy: params?.orderBy,
            orderDirection: params?.orderDirection,
            ownerUserUid: params?.ownerUserUid,
        });
        // withParams always produces at least "/"
        const suffix = path === "/" ? "/files" : `/files${path}`;
        return this.adminRequest(suffix);
    }
    async getFile(fileUid) {
        return this.adminRequest(`/files/${encodeURIComponent(fileUid)}`);
    }
    async patchFile(input) {
        return this.adminRequest(`/files/${encodeURIComponent(input.fileUid)}`, {
            method: "PATCH",
            body: JSON.stringify(input.patch),
        });
    }
    // ─── File lifecycle ─────────────────────────────────────────────────
    async archiveFile(fileUid) {
        return this.adminRequest(`/files/${encodeURIComponent(fileUid)}/archive`, { method: "POST" });
    }
    async restoreFile(fileUid) {
        return this.adminRequest(`/files/${encodeURIComponent(fileUid)}/restore`, { method: "POST" });
    }
    async deleteFile(input) {
        const path = input.force
            ? withParams(`/files/${encodeURIComponent(input.fileUid)}`, {
                force: true,
            })
            : `/files/${encodeURIComponent(input.fileUid)}`;
        return this.adminRequest(path, { method: "DELETE" });
    }
    async moveFile(input) {
        return this.adminRequest(`/files/${encodeURIComponent(input.fileUid)}/move`, {
            method: "POST",
            body: JSON.stringify({
                toBucket: input.toBucket,
                toFolderPath: input.toFolderPath,
            }),
        });
    }
    // ─── Metadata & URLs ───────────────────────────────────────────────
    async getReadUrl(input) {
        const path = withParams(`/files/${encodeURIComponent(input.fileUid)}/url`, {
            variantKind: input.variantKind,
            expiresInSeconds: input.expiresInSeconds,
        });
        return this.adminRequest(path);
    }
    async getObjectMetadata(input) {
        const path = withParams(`/files/${encodeURIComponent(input.fileUid)}/object-metadata`, { variantKind: input.variantKind });
        return this.adminRequest(path);
    }
    async listVariants(fileUid) {
        return this.adminRequest(`/files/${encodeURIComponent(fileUid)}/variants`);
    }
    // ─── Links ──────────────────────────────────────────────────────────
    async listLinks(input) {
        const path = withParams(`/files/${encodeURIComponent(input.fileUid)}/links`, { limit: input.limit, offset: input.offset });
        return this.adminRequest(path);
    }
    async createLink(input) {
        return this.adminRequest(`/files/${encodeURIComponent(input.fileUid)}/links`, {
            method: "POST",
            body: JSON.stringify({
                linkedEntityType: input.linkedEntityType,
                linkedEntityUid: input.linkedEntityUid,
                linkedField: input.linkedField,
            }),
        });
    }
    async deleteLink(input) {
        const path = withParams(`/files/${encodeURIComponent(input.fileUid)}/links`, {
            linkedEntityType: input.linkedEntityType,
            linkedEntityUid: input.linkedEntityUid,
            linkedField: input.linkedField,
        });
        await this.adminRequest(path, { method: "DELETE" });
    }
    // ─── Synchronous URL builders ───────────────────────────────────────
    getContentUrl(input) {
        return withParams(`${this.contentBaseUrl}/${encodeURIComponent(input.fileUid)}`, {
            dl: input.download ? 1 : undefined,
            v: input.variantKind,
        });
    }
    getProxyUploadUrl(fileUid) {
        return `${this.adminBaseUrl}/upload/${encodeURIComponent(fileUid)}/proxy`;
    }
    getVariantProxyUploadUrl(variantUid) {
        return `${this.adminBaseUrl}/variants/upload/${encodeURIComponent(variantUid)}/proxy`;
    }
    getPublicMediaUrl(fileUid) {
        return `${this.publicBaseUrl}/${encodeURIComponent(fileUid)}`;
    }
}
