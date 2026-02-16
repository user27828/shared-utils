/**
 * useFmListFiles — shared-utils/client/fm/hooks
 *
 * React hook for paginated FM file listing with search, filtering, and
 * sorting. Accepts an optional `api` parameter for dependency injection;
 * falls back to the module-level default FmClient instance.
 *
 * Ported from db-supabase/client/fm/hooks/useFmListFiles.ts — now uses
 * the FmApi interface instead of standalone functions.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FmClient } from "../FmClient.js";
/** Module-level default — stateless, so sharing a single instance is safe. */
const defaultClient = new FmClient();
// ─── Hook ─────────────────────────────────────────────────────────────────
/**
 * React hook for paginated FM file listing with search, filtering, and sorting.
 *
 * Auto-fetches on mount and whenever inputs change. Supply `enabled: false`
 * to defer the initial fetch. Uses the provided `api` or falls back to
 * a module-level default {@link FmClient}.
 */
export const useFmListFiles = (params = {}) => {
    const enabled = params.enabled !== false;
    const api = params.api ?? defaultClient;
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Memoize the request object so the effect only re-runs when inputs change.
    const request = useMemo(() => ({
        search: params.search,
        limit: params.limit,
        offset: params.offset,
        includeArchived: params.includeArchived,
        isPublic: params.isPublic,
        orderBy: params.orderBy,
        orderDirection: params.orderDirection,
        ownerUserUid: params.ownerUserUid,
    }), [
        params.search,
        params.limit,
        params.offset,
        params.includeArchived,
        params.isPublic,
        params.orderBy,
        params.orderDirection,
        params.ownerUserUid,
    ]);
    const reload = useCallback(async () => {
        if (!enabled) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const next = await api.listFiles(request);
            setData(next);
        }
        catch (e) {
            setError(e?.message || "Failed to load files");
            setData(null);
        }
        finally {
            setIsLoading(false);
        }
    }, [enabled, api, request]);
    useEffect(() => {
        void reload();
    }, [reload]);
    return {
        items: data?.items || [],
        totalCount: data?.totalCount || 0,
        limit: data?.limit || request.limit || 25,
        offset: data?.offset || request.offset || 0,
        isLoading,
        error,
        reload,
    };
};
