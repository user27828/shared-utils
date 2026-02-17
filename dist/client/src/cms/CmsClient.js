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
        await this.adminRequest(`/${encodeURIComponent(uid)}`, {
            method: "DELETE",
        });
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
        return this.adminRequest(`/${encodeURIComponent(uid)}/lock`, {
            method: "POST",
        });
    }
    async adminUnlock(uid) {
        return this.adminRequest(`/${encodeURIComponent(uid)}/lock`, {
            method: "DELETE",
        });
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
        const preview = Boolean(params.preview);
        const urlBase = `${this.publicBaseUrl}/${encodeURIComponent(params.postType)}/${encodeURIComponent(params.locale)}/${encodeURIComponent(params.slug)}`;
        const url = preview ? withParams(urlBase, { preview: 1 }) : urlBase;
        const headers = {
            Accept: "application/json",
        };
        if (params.unlockToken) {
            headers["Authorization"] = `Bearer ${params.unlockToken}`;
        }
        const inm = String(params.ifNoneMatch || "").trim();
        if (inm) {
            headers["If-None-Match"] = inm;
        }
        const resp = await this.fetchFn(url, {
            credentials: preview ? "include" : "omit", // preview requires auth cookies
            headers,
        });
        const etag = resp.headers.get("ETag");
        if (resp.status === 304) {
            return { kind: "not_modified", etag };
        }
        const text = await resp.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            return {
                kind: "error",
                message: text || resp.statusText || "Invalid response",
                statusCode: resp.status,
            };
        }
        if (resp.status === 404) {
            return { kind: "not_found", message: json?.message || "Not found" };
        }
        if (resp.status === 401 && json?.requiresPassword) {
            return {
                kind: "password_required",
                message: json?.message || "Password required",
                etag,
            };
        }
        if (!resp.ok) {
            return {
                kind: "error",
                message: json?.message || resp.statusText || "Request failed",
                statusCode: resp.status,
            };
        }
        const payload = json?.data;
        if (!json?.success || !payload) {
            return {
                kind: "error",
                message: json?.message || "Invalid response",
                statusCode: resp.status,
            };
        }
        return { kind: "ok", data: payload, etag };
    }
    async publicUnlock(params) {
        const password = String(params.password || "");
        if (!password.trim()) {
            return {
                kind: "error",
                message: "Password is required",
                statusCode: 400,
            };
        }
        const url = `${this.publicBaseUrl}/${encodeURIComponent(params.postType)}/${encodeURIComponent(params.locale)}/${encodeURIComponent(params.slug)}/unlock`;
        const resp = await this.fetchFn(url, {
            method: "POST",
            credentials: "omit",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ password }),
        });
        const text = await resp.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            return {
                kind: "error",
                message: text || resp.statusText || "Unlock failed",
                statusCode: resp.status,
            };
        }
        if (resp.status === 404) {
            return { kind: "not_found", message: json?.message || "Not found" };
        }
        if (resp.status === 409) {
            return {
                kind: "not_protected",
                message: json?.message || "Not password protected",
            };
        }
        if (resp.status === 403) {
            return {
                kind: "invalid_password",
                message: json?.message || "Invalid password",
            };
        }
        if (!resp.ok) {
            return {
                kind: "error",
                message: json?.message || resp.statusText || "Unlock failed",
                statusCode: resp.status,
            };
        }
        const token = String(json?.data?.token || "").trim();
        const expiresAt = String(json?.data?.expiresAt || "").trim();
        if (!json?.success || !token || !expiresAt) {
            return {
                kind: "error",
                message: json?.message || "Invalid unlock response",
                statusCode: resp.status,
            };
        }
        return { kind: "ok", token, expiresAt };
    }
}
