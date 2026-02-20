import type { CmsConnector } from "./connector.js";
import type { CmsHeadRow, CmsHistoryRow, CmsListRequest, CmsListResponse, CmsCreateRequest, CmsUpdateRequest, CmsPublicPayload, CmsAfterWriteEvent, CmsCollaboratorRow, CmsPublicHead } from "../../../utils/src/cms/types.js";
export interface CmsServiceCoreConfig {
    /** The DB connector implementation. */
    connector: CmsConnector;
    /** Slugs that cannot be used (e.g., "admin", "api", "auth"). */
    reservedSlugs?: string[];
    /** Optional callback fired after write operations. */
    onAfterWrite?: (event: CmsAfterWriteEvent) => Promise<void>;
    /** Lock TTL in milliseconds (default: 10 minutes). */
    lockTtlMs?: number;
}
export declare class CmsServiceCore {
    private connector;
    private reservedSlugs;
    private onAfterWrite?;
    private lockTtlMs;
    constructor(config: CmsServiceCoreConfig);
    list(params: CmsListRequest): Promise<CmsListResponse>;
    getByUid(uid: string): Promise<CmsHeadRow>;
    create(input: {
        request: CmsCreateRequest;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    updateByUid(input: {
        uid: string;
        patch: CmsUpdateRequest;
        ifMatchHeader: string | null | undefined;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    publishByUid(input: {
        uid: string;
        publishedAt?: string;
        ifMatchHeader: string | null | undefined;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    trashByUid(input: {
        uid: string;
        ifMatchHeader: string | null | undefined;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    restoreByUid(input: {
        uid: string;
        ifMatchHeader: string | null | undefined;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    /**
     * Permanently delete a CMS item. Enforces trash-first precondition:
     * the item must have status === "trash" before permanent deletion.
     */
    deleteByUid(input: {
        uid: string;
        actorUserUid?: string | null;
    }): Promise<void>;
    /**
     * Permanently delete all trashed items (up to limit).
     * Fires onAfterWrite({ type: "delete" }) for each item.
     */
    emptyTrash(input?: {
        limit?: number;
        actorUserUid?: string | null;
    }): Promise<{
        deletedCount: number;
    }>;
    lockByUid(input: {
        uid: string;
        actorUserUid: string;
    }): Promise<CmsHeadRow>;
    unlockByUid(input: {
        uid: string;
        actorUserUid: string;
        force?: boolean;
    }): Promise<CmsHeadRow>;
    listHistory(params: {
        cmsUid: string;
        limit?: number;
        offset?: number;
        includeSoftDeleted?: boolean;
    }): Promise<{
        items: CmsHistoryRow[];
        totalCount: number;
    }>;
    /**
     * Restore a history revision to the head row.
     * Creates a snapshot of the current state first, then applies
     * the history snapshot to the head row.
     */
    restoreHistoryRevision(input: {
        cmsUid: string;
        historyId: number;
        ifMatchHeader: string | null | undefined;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    softDeleteHistoryRevision(input: {
        historyId: number;
        actorUserUid?: string | null;
    }): Promise<CmsHistoryRow>;
    hardDeleteHistoryRevision(historyId: number): Promise<void>;
    listCollaborators(cmsUid: string): Promise<CmsCollaboratorRow[]>;
    replaceCollaborators(cmsUid: string, collaborators: Array<{
        user_uid: string;
        role: string;
    }>): Promise<CmsCollaboratorRow[]>;
    getPublicPayloadBySlug(params: {
        postType: string;
        locale: string;
        slug: string;
    }): Promise<CmsPublicPayload | null>;
    /**
     * Render a safe payload for previewing a CMS item by UID.
     * Intended for authenticated preview flows (e.g., draft previews).
     */
    getPreviewPayloadByUid(uid: string): Promise<CmsPublicPayload | null>;
    getPublicHead(params: {
        postType: string;
        locale: string;
        slug: string;
    }): Promise<CmsPublicHead | null>;
    /**
     * Render a CMS head row into a safe public payload.
     * Sanitizes HTML, renders markdown, parses JSON.
     */
    private renderPublicPayload;
    /**
     * Best-effort: create a history snapshot of the current state.
     * Errors are caught and logged but not propagated.
     */
    private createHistorySnapshot;
    /**
     * Update only the metadata column of a CMS item without creating a
     * history snapshot or bumping the version/etag. Used for adding
     * content notes or editing version annotations independently of
     * content saves.
     */
    updateMetadataByUid(input: {
        uid: string;
        metadata: unknown;
        actorUserUid?: string | null;
    }): Promise<CmsHeadRow>;
    /**
     * Annotate a history revision with version metadata (version label
     * and/or notes). Modifies the snapshot JSON in-place without
     * affecting the head row.
     */
    updateHistoryVersionMeta(input: {
        historyId: number;
        version?: string | null;
        notes?: string | null;
        actorUserUid?: string | null;
    }): Promise<CmsHistoryRow>;
    /**
     * Stamp `user_uid` on metadata.version and any metadata.notes entries
     * that do not already have a `user_uid`. Mutates a shallow copy.
     */
    private stampMetadataUserUid;
    /**
     * Build a snapshot object from a CMS head row for history storage.
     */
    private buildHistorySnapshot;
    private fireAfterWrite;
}
//# sourceMappingURL=CmsServiceCore.d.ts.map