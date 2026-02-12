import type { CmsHeadRow, CmsHistoryRow, CmsListRequest, CmsListResponse, CmsCollaboratorRow, CmsPublicHead } from "../../../utils/src/cms/types.js";
export interface CmsConnector {
    getByUid(uid: string): Promise<CmsHeadRow | null>;
    insert(row: Partial<CmsHeadRow> & {
        uid: string;
    }): Promise<CmsHeadRow>;
    updateByUid(uid: string, patch: Partial<CmsHeadRow>): Promise<CmsHeadRow | null>;
    deleteByUid(uid: string): Promise<void>;
    list(params: CmsListRequest): Promise<CmsListResponse>;
    getPublishedBySlug(params: {
        postType: string;
        locale: string;
        slug: string;
    }): Promise<CmsHeadRow | null>;
    insertHistory(row: {
        cms_uid: string;
        revision: number;
        snapshot: unknown;
        created_by: string | null;
    }): Promise<CmsHistoryRow>;
    listHistory(params: {
        cmsUid: string;
        limit?: number;
        offset?: number;
        includeSoftDeleted?: boolean;
    }): Promise<{
        items: CmsHistoryRow[];
        totalCount: number;
    }>;
    getHistoryById(id: number): Promise<CmsHistoryRow | null>;
    updateHistoryById(id: number, patch: Partial<CmsHistoryRow>): Promise<CmsHistoryRow | null>;
    deleteHistoryById(id: number): Promise<void>;
    listCollaborators(cmsUid: string): Promise<CmsCollaboratorRow[]>;
    replaceCollaborators(cmsUid: string, collaborators: Array<{
        user_uid: string;
        role: string;
    }>): Promise<CmsCollaboratorRow[]>;
}
export interface CmsConnectorWithPublicHead extends CmsConnector {
    getPublicHeadBySlug(params: {
        postType: string;
        locale: string;
        slug: string;
    }): Promise<CmsPublicHead | null>;
}
export declare const hasPublicHead: (connector: CmsConnector) => connector is CmsConnectorWithPublicHead;
//# sourceMappingURL=connector.d.ts.map