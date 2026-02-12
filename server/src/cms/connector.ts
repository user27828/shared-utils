/**
 * CMS Connector Interface — shared-utils
 *
 * The "port" that database-specific adapters (db-supabase, db-postgres, etc.)
 * must implement. The core service depends only on this interface.
 *
 * Connectors are responsible for:
 * - Persistence and query details
 * - DB column mapping (e.g. API `content` ↔ DB `body`)
 * - Returning data shaped as CMS API types
 *
 * Connectors must NOT:
 * - Perform sanitization (core responsibility)
 * - Compute or validate ETags (core responsibility)
 * - Hash passwords (core responsibility)
 */
import type {
  CmsHeadRow,
  CmsHistoryRow,
  CmsListRequest,
  CmsListResponse,
  CmsCollaboratorRow,
  CmsPublicHead,
} from "../../../utils/src/cms/types.js";

// ─── Core connector interface ────────────────────────────────────────────

export interface CmsConnector {
  // ── Head table CRUD ─────────────────────────────────────────────────

  /** Get a single CMS row by UID. */
  getByUid(uid: string): Promise<CmsHeadRow | null>;

  /** Insert a new CMS row. Returns the inserted row. */
  insert(row: Partial<CmsHeadRow> & { uid: string }): Promise<CmsHeadRow>;

  /** Update a CMS row by UID. Returns the updated row. */
  updateByUid(
    uid: string,
    patch: Partial<CmsHeadRow>,
  ): Promise<CmsHeadRow | null>;

  /** Permanently delete a CMS row by UID. */
  deleteByUid(uid: string): Promise<void>;

  /** List CMS rows with filtering, search, pagination. */
  list(params: CmsListRequest): Promise<CmsListResponse>;

  // ── Public read ─────────────────────────────────────────────────────

  /**
   * Get a published row by slug for public rendering.
   * Must filter: status=published, archived_at IS NULL, published_at <= now.
   */
  getPublishedBySlug(params: {
    postType: string;
    locale: string;
    slug: string;
  }): Promise<CmsHeadRow | null>;

  // ── History ─────────────────────────────────────────────────────────

  /** Insert a history snapshot row. */
  insertHistory(row: {
    cms_uid: string;
    revision: number;
    snapshot: unknown;
    created_by: string | null;
  }): Promise<CmsHistoryRow>;

  /**
   * List history revisions for a CMS UID.
   * Must exclude soft-deleted rows by default unless includeSoftDeleted=true.
   */
  listHistory(params: {
    cmsUid: string;
    limit?: number;
    offset?: number;
    includeSoftDeleted?: boolean;
  }): Promise<{ items: CmsHistoryRow[]; totalCount: number }>;

  /** Get a single history row by ID. */
  getHistoryById(id: number): Promise<CmsHistoryRow | null>;

  /** Update a history row (e.g., soft-delete fields). */
  updateHistoryById(
    id: number,
    patch: Partial<CmsHistoryRow>,
  ): Promise<CmsHistoryRow | null>;

  /** Permanently delete a history row by ID. */
  deleteHistoryById(id: number): Promise<void>;

  // ── Collaborators ───────────────────────────────────────────────────

  /** List collaborators for a CMS UID. */
  listCollaborators(cmsUid: string): Promise<CmsCollaboratorRow[]>;

  /**
   * Replace all collaborators for a CMS UID.
   * Deletes existing, inserts new. Returns the new list.
   */
  replaceCollaborators(
    cmsUid: string,
    collaborators: Array<{ user_uid: string; role: string }>,
  ): Promise<CmsCollaboratorRow[]>;
}

// ─── Optional capabilities ───────────────────────────────────────────────

/**
 * Optional capability: lightweight public head fetch for 304/password gating.
 * Avoids fetching the full content body.
 */
export interface CmsConnectorWithPublicHead extends CmsConnector {
  getPublicHeadBySlug(params: {
    postType: string;
    locale: string;
    slug: string;
  }): Promise<CmsPublicHead | null>;
}

/** Type guard to check if a connector supports public head */
export const hasPublicHead = (
  connector: CmsConnector,
): connector is CmsConnectorWithPublicHead => {
  return typeof (connector as any).getPublicHeadBySlug === "function";
};
