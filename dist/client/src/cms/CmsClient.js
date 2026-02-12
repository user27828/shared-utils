// ─── Error class ──────────────────────────────────────────────────────────
export class CmsClientError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = "CmsClientError";
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
export class CmsClient {
    constructor(config) {
        this.adminBaseUrl = config?.adminBaseUrl ?? "/api/admin/cms";
        this.publicBaseUrl = config?.publicBaseUrl ?? "/api/public/cms";
        this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
    }
    // ─── Internal fetch helpers ─────────────────────────────────────────
    async request(url, opts) {
        const resp = await this.fetchFn(url, opts);
        const text = await resp.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            throw new CmsClientError(text || resp.statusText, resp.status);
        }
        if (!resp.ok) {
            throw new CmsClientError(json?.message || resp.statusText, resp.status, json?.code);
        }
        return json;
    }
    async adminRequest(path, opts) {
        const envelope = await this.request(`${this.adminBaseUrl}${path}`, {
            credentials: "include",
            ...opts,
            headers: {
                "Content-Type": "application/json",
                ...opts?.headers,
            },
        });
        return envelope.data;
    }
    // ─── Admin CRUD ─────────────────────────────────────────────────────
    async adminList(params) {
        const path = withParams("", params ?? {});
        const url = path === "/" ? "" : path;
        return this.adminRequest(url);
    }
    async adminGet(uid) {
        return this.adminRequest(`/${encodeURIComponent(uid)}`);
    }
    async adminCreate(request) {
        return this.adminRequest("", {
            method: "POST",
            body: JSON.stringify(request),
        });
    }
    async adminUpdate(input) {
        return this.adminRequest(`/${encodeURIComponent(input.uid)}`, {
            method: "PUT",
            body: JSON.stringify(input.patch),
            headers: { "If-Match": input.ifMatch },
        });
    }
    async adminPublish(input) {
        return this.adminRequest(`/${encodeURIComponent(input.uid)}/publish`, {
            method: "POST",
            body: JSON.stringify({
                published_at: input.published_at,
            }),
            headers: { "If-Match": input.ifMatch },
        });
    }
    // ─── Admin trash/restore/delete ─────────────────────────────────────
    async adminTrash(input) {
        return this.adminRequest(`/${encodeURIComponent(input.uid)}/trash`, {
            method: "POST",
            headers: { "If-Match": input.ifMatch },
        });
    }
    async adminRestore(input) {
        return this.adminRequest(`/${encodeURIComponent(input.uid)}/restore`, {
            method: "POST",
            headers: { "If-Match": input.ifMatch },
        });
    }
    async adminDeletePermanently(uid) {
        await this.adminRequest(`/${encodeURIComponent(uid)}`, { method: "DELETE" });
    }
    async adminEmptyTrash(limit) {
        return this.adminRequest("/trash/empty", {
            method: "POST",
            body: JSON.stringify({ limit }),
        });
    }
    // ─── Admin history ──────────────────────────────────────────────────
    async adminListHistory(uid, opts) {
        const path = withParams(`/${encodeURIComponent(uid)}/history`, opts ?? {});
        return this.adminRequest(path);
    }
    async adminRestoreHistory(input) {
        return this.adminRequest(`/${encodeURIComponent(input.uid)}/history/${input.historyId}/restore`, {
            method: "POST",
            headers: { "If-Match": input.ifMatch },
        });
    }
    async adminSoftDeleteHistory(input) {
        return this.adminRequest(`/${encodeURIComponent(input.uid)}/history/${input.historyId}`, { method: "DELETE" });
    }
    async adminHardDeleteHistory(input) {
        await this.adminRequest(`/${encodeURIComponent(input.uid)}/history/${input.historyId}/hard`, { method: "DELETE" });
    }
    // ─── Admin lock ─────────────────────────────────────────────────────
    async adminLock(uid) {
        return this.adminRequest(`/${encodeURIComponent(uid)}/lock`, { method: "POST" });
    }
    async adminUnlock(uid) {
        return this.adminRequest(`/${encodeURIComponent(uid)}/lock`, { method: "DELETE" });
    }
    // ─── Admin collaborators ────────────────────────────────────────────
    async adminListCollaborators(uid) {
        return this.adminRequest(`/${encodeURIComponent(uid)}/collaborators`);
    }
    async adminReplaceCollaborators(uid, collaborators) {
        return this.adminRequest(`/${encodeURIComponent(uid)}/collaborators`, {
            method: "PUT",
            body: JSON.stringify({ collaborators }),
        });
    }
    // ─── Public ─────────────────────────────────────────────────────────
    async publicGet(params) {
        const url = `${this.publicBaseUrl}/${encodeURIComponent(params.postType)}/${encodeURIComponent(params.locale)}/${encodeURIComponent(params.slug)}`;
        const headers = {};
        if (params.unlockToken) {
            headers["Authorization"] = `Bearer ${params.unlockToken}`;
        }
        const resp = await this.fetchFn(url, {
            credentials: "omit", // CDN-friendly
            headers,
        });
        const text = await resp.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            throw new CmsClientError(text || resp.statusText, resp.status);
        }
        if (!resp.ok) {
            throw new CmsClientError(json?.message || resp.statusText, resp.status, json?.code);
        }
        return (json?.data ?? json);
    }
}
