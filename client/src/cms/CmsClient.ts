/**
 * CMS Client — shared-utils
 *
 * Default CmsApi implementation using fetch().
 * Covers the full admin + public surface including trash/restore,
 * history, lock/unlock, and collaborators.
 */
import type {
  CmsHeadRow,
  CmsHistoryRow,
  CmsListResponse,
  CmsCreateRequest,
  CmsUpdateRequest,
  CmsPublicPayload,
  CmsCollaboratorRow,
} from "../../../utils/src/cms/types.js";
import type {
  CmsApi,
  CmsAdminListParams,
  CmsPublicGetResult,
  CmsPublicUnlockResult,
} from "./CmsApi.js";

// ─── Error class ──────────────────────────────────────────────────────────

export class CmsClientError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "CmsClientError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────

export interface CmsClientConfig {
  /** Base URL for admin endpoints (default: "/api/admin/cms"). */
  adminBaseUrl?: string;
  /** Base URL for public endpoints (default: "/api/public/cms"). */
  publicBaseUrl?: string;
  /** Optional custom fetch implementation (for testing). */
  fetchFn?: typeof fetch;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
};

const withParams = (base: string, params: Record<string, unknown>): string => {
  const url = new URL(base, "http://placeholder");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  return `${url.pathname}${url.search}`;
};

// ─── Client ───────────────────────────────────────────────────────────────

export class CmsClient implements CmsApi {
  private adminBaseUrl: string;
  private publicBaseUrl: string;
  private fetchFn: typeof fetch;

  constructor(config?: CmsClientConfig) {
    this.adminBaseUrl = config?.adminBaseUrl ?? "/api/admin/cms";
    this.publicBaseUrl = config?.publicBaseUrl ?? "/api/public/cms";
    this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
  }

  // ─── Internal fetch helpers ─────────────────────────────────────────

  private async request<T>(url: string, opts?: RequestInit): Promise<T> {
    const resp = await this.fetchFn(url, opts);
    const text = await resp.text();

    let json: any;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new CmsClientError(text || resp.statusText, resp.status);
    }

    if (!resp.ok) {
      throw new CmsClientError(
        json?.message || resp.statusText,
        resp.status,
        json?.code,
      );
    }

    return json as T;
  }

  private async adminRequest<T>(path: string, opts?: RequestInit): Promise<T> {
    const envelope = await this.request<ApiEnvelope<T>>(
      `${this.adminBaseUrl}${path}`,
      {
        credentials: "include",
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...opts?.headers,
        },
      },
    );
    return envelope.data as T;
  }

  // ─── Admin CRUD ─────────────────────────────────────────────────────

  async adminList(params?: CmsAdminListParams): Promise<CmsListResponse> {
    const path = withParams("", params ?? {});
    const url = path === "/" ? "" : path;
    return this.adminRequest<CmsListResponse>(url);
  }

  async adminGet(uid: string): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(`/${encodeURIComponent(uid)}`);
  }

  async adminCreate(request: CmsCreateRequest): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>("", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async adminUpdate(input: {
    uid: string;
    patch: CmsUpdateRequest;
    ifMatch: string;
  }): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(`/${encodeURIComponent(input.uid)}`, {
      method: "PUT",
      body: JSON.stringify(input.patch),
      headers: { "If-Match": input.ifMatch },
    });
  }

  async adminPublish(input: {
    uid: string;
    ifMatch: string;
    published_at?: string;
  }): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(
      `/${encodeURIComponent(input.uid)}/publish`,
      {
        method: "POST",
        body: JSON.stringify({
          published_at: input.published_at,
        }),
        headers: { "If-Match": input.ifMatch },
      },
    );
  }

  // ─── Admin trash/restore/delete ─────────────────────────────────────

  async adminTrash(input: {
    uid: string;
    ifMatch: string;
  }): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(
      `/${encodeURIComponent(input.uid)}/trash`,
      {
        method: "POST",
        headers: { "If-Match": input.ifMatch },
      },
    );
  }

  async adminRestore(input: {
    uid: string;
    ifMatch: string;
  }): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(
      `/${encodeURIComponent(input.uid)}/restore`,
      {
        method: "POST",
        headers: { "If-Match": input.ifMatch },
      },
    );
  }

  async adminDeletePermanently(uid: string): Promise<void> {
    await this.adminRequest<void>(`/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
  }

  async adminEmptyTrash(limit?: number): Promise<{ deletedCount: number }> {
    return this.adminRequest<{ deletedCount: number }>("/trash/empty", {
      method: "POST",
      body: JSON.stringify({ limit }),
    });
  }

  // ─── Admin history ──────────────────────────────────────────────────

  async adminListHistory(
    uid: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<{
    items: CmsHistoryRow[];
    totalCount: number;
    limit: number;
    offset: number;
  }> {
    const path = withParams(`/${encodeURIComponent(uid)}/history`, opts ?? {});
    return this.adminRequest(path);
  }

  async adminRestoreHistory(input: {
    uid: string;
    historyId: number;
    ifMatch: string;
  }): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(
      `/${encodeURIComponent(input.uid)}/history/${input.historyId}/restore`,
      {
        method: "POST",
        headers: { "If-Match": input.ifMatch },
      },
    );
  }

  async adminSoftDeleteHistory(input: {
    uid: string;
    historyId: number;
  }): Promise<CmsHistoryRow> {
    return this.adminRequest<CmsHistoryRow>(
      `/${encodeURIComponent(input.uid)}/history/${input.historyId}`,
      { method: "DELETE" },
    );
  }

  async adminHardDeleteHistory(input: {
    uid: string;
    historyId: number;
  }): Promise<void> {
    await this.adminRequest<void>(
      `/${encodeURIComponent(input.uid)}/history/${input.historyId}/hard`,
      { method: "DELETE" },
    );
  }

  // ─── Admin lock ─────────────────────────────────────────────────────

  async adminLock(uid: string): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(`/${encodeURIComponent(uid)}/lock`, {
      method: "POST",
    });
  }

  async adminUnlock(uid: string): Promise<CmsHeadRow> {
    return this.adminRequest<CmsHeadRow>(`/${encodeURIComponent(uid)}/lock`, {
      method: "DELETE",
    });
  }

  // ─── Admin collaborators ────────────────────────────────────────────

  async adminListCollaborators(uid: string): Promise<CmsCollaboratorRow[]> {
    return this.adminRequest<CmsCollaboratorRow[]>(
      `/${encodeURIComponent(uid)}/collaborators`,
    );
  }

  async adminReplaceCollaborators(
    uid: string,
    collaborators: Array<{ user_uid: string; role: string }>,
  ): Promise<CmsCollaboratorRow[]> {
    return this.adminRequest<CmsCollaboratorRow[]>(
      `/${encodeURIComponent(uid)}/collaborators`,
      {
        method: "PUT",
        body: JSON.stringify({ collaborators }),
      },
    );
  }

  // ─── Public ─────────────────────────────────────────────────────────

  async publicGet(params: {
    postType: string;
    locale: string;
    slug: string;
    unlockToken?: string;
    ifNoneMatch?: string;
    preview?: boolean;
  }): Promise<CmsPublicGetResult> {
    const preview = Boolean(params.preview);
    const urlBase = `${this.publicBaseUrl}/${encodeURIComponent(params.postType)}/${encodeURIComponent(params.locale)}/${encodeURIComponent(params.slug)}`;
    const url = preview ? withParams(urlBase, { preview: 1 }) : urlBase;

    const headers: Record<string, string> = {
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
    let json: any;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
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

    const payload = json?.data as CmsPublicPayload | undefined;
    if (!json?.success || !payload) {
      return {
        kind: "error",
        message: json?.message || "Invalid response",
        statusCode: resp.status,
      };
    }

    return { kind: "ok", data: payload, etag };
  }

  async publicUnlock(params: {
    postType: string;
    locale: string;
    slug: string;
    password: string;
  }): Promise<CmsPublicUnlockResult> {
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
    let json: any;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
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
