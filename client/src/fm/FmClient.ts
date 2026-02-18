/**
 * FM Client — shared-utils/client/fm
 *
 * Default FmApi implementation using fetch().
 * Covers the full admin surface (upload, CRUD, archive/restore/delete,
 * move, variants, links) plus synchronous URL builders for content
 * delivery and proxy uploads.
 *
 * Follows the same pattern as CmsClient:
 *   - constructor accepts config with base URLs and optional fetchFn
 *   - methods unwrap the `{ success, data, message, code }` envelope
 *   - FmClientError carries statusCode + code for programmatic handling
 */
import type {
  FmFileRow,
  FmFileVariantRow,
  FmFileLinkRow,
  FmFileListFilters,
  FmFileListResult,
  FmFileLinkListResult,
  FmUploadInitRequest,
  FmUploadInitResponse,
  FmUploadFinalizeResponse,
  FmVariantUploadInitRequest,
  FmVariantUploadInitResponse,
  FmVariantUploadFinalizeResponse,
} from "../../../utils/src/fm/types.js";
import type { FmUploadProgressCallback } from "../../../utils/src/fm/types.js";
import type { FmApi, FmDeleteResult, FmReadUrlResult } from "./FmApi.js";

// ─── Error class ──────────────────────────────────────────────────────────

/**
 * Error thrown by {@link FmClient} when an API call fails.
 * Carries HTTP `statusCode` and optional machine-readable `code`.
 */
export class FmClientError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "FmClientError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────

/**
 * Configuration for {@link FmClient}.
 * All fields are optional — sensible defaults are applied.
 */
export interface FmClientConfig {
  /** Base URL for admin FM endpoints (default: "/api/fm"). */
  adminBaseUrl?: string;
  /**
   * Base URL for content-streaming URLs (`<img src>`, downloads).
   * When set, {@link FmClient.getContentUrl} uses this instead of
   * `adminBaseUrl`, allowing content delivery to be routed separately
   * from admin CRUD operations (e.g. to a user-scoped or CDN endpoint).
   *
   * Falls back to `adminBaseUrl` when not specified (backward compatible).
   */
  contentBaseUrl?: string;
  /** Base URL for public media endpoints (default: "/media"). */
  publicBaseUrl?: string;
  /** Optional custom fetch implementation (for testing / SSR). */
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

/**
 * Default {@link FmApi} implementation using `fetch()` (with XHR fallback
 * for upload progress tracking).
 *
 * Handles the full admin surface: upload lifecycle, CRUD, archive/restore,
 * move, variants, links, and synchronous URL builders for content delivery.
 */
export class FmClient implements FmApi {
  private adminBaseUrl: string;
  private contentBaseUrl: string;
  private hasExplicitContentBase: boolean;
  private publicBaseUrl: string;
  private fetchFn: typeof fetch;

  constructor(config?: FmClientConfig) {
    this.adminBaseUrl = (config?.adminBaseUrl ?? "/api/fm").replace(/\/+$/, "");
    this.hasExplicitContentBase = !!config?.contentBaseUrl;
    this.contentBaseUrl = (config?.contentBaseUrl ?? this.adminBaseUrl).replace(
      /\/+$/,
      "",
    );
    this.publicBaseUrl = (config?.publicBaseUrl ?? "/media").replace(
      /\/+$/,
      "",
    );
    this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
  }

  // ─── Internal fetch helpers ─────────────────────────────────────────

  /**
   * Low-level request that parses JSON and throws FmClientError on failure.
   */
  private async request<T>(url: string, opts?: RequestInit): Promise<T> {
    const resp = await this.fetchFn(url, opts);
    const text = await resp.text();

    let json: any;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new FmClientError(text || resp.statusText, resp.status);
    }

    if (!resp.ok) {
      throw new FmClientError(
        json?.message || resp.statusText,
        resp.status,
        json?.code,
      );
    }

    return json as T;
  }

  /**
   * Admin request with envelope unwrapping.
   * Automatically sets credentials: "include" and Content-Type: "application/json".
   */
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
    if (!envelope.success) {
      throw new FmClientError(envelope.message || "Request failed");
    }
    return envelope.data as T;
  }

  /**
   * Raw-body admin request (for proxy uploads).
   * Does NOT set Content-Type: application/json — caller supplies the body's type.
   */
  private async adminRawRequest<T>(
    path: string,
    body: ArrayBuffer | Uint8Array | Blob,
    contentType?: string,
    onProgress?: FmUploadProgressCallback,
  ): Promise<T> {
    // When a progress callback is provided and XMLHttpRequest is available,
    // use XHR to get upload progress events (fetch() doesn't support this).
    if (onProgress && typeof XMLHttpRequest !== "undefined") {
      return this.adminRawRequestXhr<T>(path, body, contentType, onProgress);
    }

    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const envelope = await this.request<ApiEnvelope<T>>(
      `${this.adminBaseUrl}${path}`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: body as any,
      },
    );
    if (!envelope.success) {
      throw new FmClientError(envelope.message || "Upload failed");
    }
    return envelope.data as T;
  }

  /**
   * XHR-based raw upload with progress tracking.
   * Used when onUploadProgress is provided (fetch doesn't support upload progress).
   */
  private adminRawRequestXhr<T>(
    path: string,
    body: ArrayBuffer | Uint8Array | Blob,
    contentType?: string,
    onProgress?: FmUploadProgressCallback,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
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
        let json: ApiEnvelope<T>;
        try {
          json = JSON.parse(xhr.responseText);
        } catch {
          reject(
            new FmClientError(xhr.responseText || xhr.statusText, xhr.status),
          );
          return;
        }
        if (xhr.status >= 400 || !json.success) {
          reject(
            new FmClientError(
              json.message || xhr.statusText,
              xhr.status,
              json.code,
            ),
          );
          return;
        }
        resolve(json.data as T);
      });

      xhr.addEventListener("error", () => {
        reject(new FmClientError("Network error during upload", 0));
      });

      xhr.addEventListener("abort", () => {
        reject(new FmClientError("Upload aborted", 0));
      });

      const xhrBody: Blob | ArrayBuffer =
        body instanceof Uint8Array ? Uint8Array.from(body).buffer : body;
      xhr.send(xhrBody);
    });
  }

  // ─── Upload ─────────────────────────────────────────────────────────

  async uploadInit(input: {
    request: FmUploadInitRequest;
  }): Promise<FmUploadInitResponse> {
    return this.adminRequest<FmUploadInitResponse>("/upload/init", {
      method: "POST",
      body: JSON.stringify(input.request),
    });
  }

  async uploadFinalize(input: {
    fileUid: string;
    object: { bucket: string; objectKey: string };
  }): Promise<FmUploadFinalizeResponse> {
    return this.adminRequest<FmUploadFinalizeResponse>("/upload/finalize", {
      method: "POST",
      body: JSON.stringify({
        fileUid: input.fileUid,
        object: input.object,
      }),
    });
  }

  async uploadProxied(input: {
    fileUid: string;
    body: ArrayBuffer | Uint8Array | Blob;
    contentType?: string;
    onUploadProgress?: FmUploadProgressCallback;
  }): Promise<FmUploadFinalizeResponse> {
    return this.adminRawRequest<FmUploadFinalizeResponse>(
      `/upload/${encodeURIComponent(input.fileUid)}/proxy`,
      input.body,
      input.contentType,
      input.onUploadProgress,
    );
  }

  // ─── Variant upload ─────────────────────────────────────────────────

  async variantUploadInit(input: {
    request: FmVariantUploadInitRequest;
  }): Promise<FmVariantUploadInitResponse> {
    return this.adminRequest<FmVariantUploadInitResponse>(
      "/variants/upload/init",
      {
        method: "POST",
        body: JSON.stringify(input.request),
      },
    );
  }

  async variantUploadFinalize(input: {
    variantUid: string;
    object: { bucket: string; objectKey: string };
  }): Promise<FmVariantUploadFinalizeResponse> {
    return this.adminRequest<FmVariantUploadFinalizeResponse>(
      "/variants/upload/finalize",
      {
        method: "POST",
        body: JSON.stringify({
          variantUid: input.variantUid,
          object: input.object,
        }),
      },
    );
  }

  async variantUploadProxied(input: {
    variantUid: string;
    body: ArrayBuffer | Uint8Array | Blob;
    contentType?: string;
    onUploadProgress?: FmUploadProgressCallback;
  }): Promise<FmVariantUploadFinalizeResponse> {
    return this.adminRawRequest<FmVariantUploadFinalizeResponse>(
      `/variants/upload/${encodeURIComponent(input.variantUid)}/proxy`,
      input.body,
      input.contentType,
      input.onUploadProgress,
    );
  }

  // ─── File CRUD ──────────────────────────────────────────────────────

  async listFiles(params?: FmFileListFilters): Promise<FmFileListResult> {
    const path = withParams("", {
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
      includeArchived: params?.includeArchived,
      isPublic: params?.isPublic,
      orderBy: params?.orderBy,
      orderDirection: params?.orderDirection,
      ownerUserUid: params?.ownerUserUid,
      includeVariants: params?.includeVariants,
    });
    // withParams always produces at least "/"
    const suffix = path === "/" ? "/files" : `/files${path}`;
    return this.adminRequest<FmFileListResult>(suffix);
  }

  async getFile(fileUid: string): Promise<FmFileRow> {
    return this.adminRequest<FmFileRow>(
      `/files/${encodeURIComponent(fileUid)}`,
    );
  }

  async patchFile(input: {
    fileUid: string;
    patch: {
      title?: string;
      alt_text?: string;
      tags?: string[];
      is_public?: boolean;
    };
  }): Promise<FmFileRow> {
    return this.adminRequest<FmFileRow>(
      `/files/${encodeURIComponent(input.fileUid)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input.patch),
      },
    );
  }

  async renameFile(input: {
    fileUid: string;
    originalFilename: string;
  }): Promise<FmFileRow> {
    return this.adminRequest<FmFileRow>(
      `/files/${encodeURIComponent(input.fileUid)}/rename`,
      {
        method: "POST",
        body: JSON.stringify({
          originalFilename: input.originalFilename,
        }),
      },
    );
  }

  // ─── File lifecycle ─────────────────────────────────────────────────

  async archiveFile(fileUid: string): Promise<FmFileRow> {
    return this.adminRequest<FmFileRow>(
      `/files/${encodeURIComponent(fileUid)}/archive`,
      { method: "POST" },
    );
  }

  async restoreFile(fileUid: string): Promise<FmFileRow> {
    return this.adminRequest<FmFileRow>(
      `/files/${encodeURIComponent(fileUid)}/restore`,
      { method: "POST" },
    );
  }

  async deleteFile(input: {
    fileUid: string;
    force?: boolean;
  }): Promise<FmDeleteResult> {
    const path = input.force
      ? withParams(`/files/${encodeURIComponent(input.fileUid)}`, {
          force: true,
        })
      : `/files/${encodeURIComponent(input.fileUid)}`;

    return this.adminRequest<FmDeleteResult>(path, { method: "DELETE" });
  }

  async moveFile(input: {
    fileUid: string;
    toBucket?: string;
    toFolderPath?: string;
  }): Promise<{ file: FmFileRow; variants: FmFileVariantRow[] }> {
    return this.adminRequest<{ file: FmFileRow; variants: FmFileVariantRow[] }>(
      `/files/${encodeURIComponent(input.fileUid)}/move`,
      {
        method: "POST",
        body: JSON.stringify({
          toBucket: input.toBucket,
          toFolderPath: input.toFolderPath,
        }),
      },
    );
  }

  // ─── Metadata & URLs ───────────────────────────────────────────────

  async getReadUrl(input: {
    fileUid: string;
    variantKind?: string;
    expiresInSeconds?: number;
  }): Promise<FmReadUrlResult> {
    const path = withParams(`/files/${encodeURIComponent(input.fileUid)}/url`, {
      variantKind: input.variantKind,
      expiresInSeconds: input.expiresInSeconds,
    });
    return this.adminRequest<FmReadUrlResult>(path);
  }

  async getObjectMetadata(input: {
    fileUid: string;
    variantKind?: string;
  }): Promise<{ metadata: Record<string, string> }> {
    const path = withParams(
      `/files/${encodeURIComponent(input.fileUid)}/object-metadata`,
      { variantKind: input.variantKind },
    );
    return this.adminRequest<{ metadata: Record<string, string> }>(path);
  }

  async listVariants(fileUid: string): Promise<{ items: FmFileVariantRow[] }> {
    return this.adminRequest<{ items: FmFileVariantRow[] }>(
      `/files/${encodeURIComponent(fileUid)}/variants`,
    );
  }

  // ─── Links ──────────────────────────────────────────────────────────

  async listLinks(input: {
    fileUid: string;
    limit?: number;
    offset?: number;
  }): Promise<FmFileLinkListResult> {
    const path = withParams(
      `/files/${encodeURIComponent(input.fileUid)}/links`,
      { limit: input.limit, offset: input.offset },
    );
    return this.adminRequest<FmFileLinkListResult>(path);
  }

  async createLink(input: {
    fileUid: string;
    linkedEntityType: string;
    linkedEntityUid: string;
    linkedField?: string;
  }): Promise<FmFileLinkRow> {
    return this.adminRequest<FmFileLinkRow>(
      `/files/${encodeURIComponent(input.fileUid)}/links`,
      {
        method: "POST",
        body: JSON.stringify({
          linkedEntityType: input.linkedEntityType,
          linkedEntityUid: input.linkedEntityUid,
          linkedField: input.linkedField,
        }),
      },
    );
  }

  async deleteLink(input: {
    fileUid: string;
    linkedEntityType: string;
    linkedEntityUid: string;
    linkedField?: string;
  }): Promise<void> {
    const path = withParams(
      `/files/${encodeURIComponent(input.fileUid)}/links`,
      {
        linkedEntityType: input.linkedEntityType,
        linkedEntityUid: input.linkedEntityUid,
        linkedField: input.linkedField,
      },
    );
    await this.adminRequest<unknown>(path, { method: "DELETE" });
  }

  // ─── Synchronous URL builders ───────────────────────────────────────

  getContentUrl(input: {
    fileUid: string;
    download?: boolean;
    variantKind?: string;
    /** Exact variant width for precise size selection. */
    variantWidth?: number;
  }): string {
    if (this.hasExplicitContentBase) {
      // Standalone content router pattern: <contentBaseUrl>/<uid>
      return withParams(
        `${this.contentBaseUrl}/${encodeURIComponent(input.fileUid)}`,
        {
          dl: input.download ? 1 : undefined,
          v: input.variantKind,
          w: input.variantWidth,
        },
      );
    }
    // Admin router content streaming: <adminBaseUrl>/files/<uid>/content
    return withParams(
      `${this.adminBaseUrl}/files/${encodeURIComponent(input.fileUid)}/content`,
      {
        download: input.download ? 1 : undefined,
        variantKind: input.variantKind,
        w: input.variantWidth,
      },
    );
  }

  getProxyUploadUrl(fileUid: string): string {
    return `${this.adminBaseUrl}/upload/${encodeURIComponent(fileUid)}/proxy`;
  }

  getVariantProxyUploadUrl(variantUid: string): string {
    return `${this.adminBaseUrl}/variants/upload/${encodeURIComponent(variantUid)}/proxy`;
  }

  getPublicMediaUrl(fileUid: string): string {
    return `${this.publicBaseUrl}/${encodeURIComponent(fileUid)}`;
  }
}
