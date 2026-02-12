import type { CmsConnector } from "./connector.js";
import type { CmsHeadRow, CmsHistoryRow, CmsListRequest, CmsListResponse, CmsCreateRequest, CmsUpdateRequest, CmsPublicPayload, CmsAfterWriteEvent, CmsCollaboratorRow, CmsPublicHead } from "../../../utils/src/cms/types.js";
export interface CmsServiceCoreConfig {
    connector: CmsConnector;
    reservedSlugs?: string[];
    onAfterWrite?: (event: CmsAfterWriteEvent) => Promise<void>;
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
    deleteByUid(input: {
        uid: string;
        actorUserUid?: string | null;
    }): Promise<void>;
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
    getPublicHead(params: {
        postType: string;
        locale: string;
        slug: string;
    }): Promise<CmsPublicHead | null>;
    private renderPublicPayload;
    private createHistorySnapshot;
    private buildHistorySnapshot;
    private fireAfterWrite;
}
//# sourceMappingURL=CmsServiceCore.d.ts.map