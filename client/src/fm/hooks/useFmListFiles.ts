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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  FmFileListResult,
  FmFilesOrderBy,
} from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
import { FmClient } from "../FmClient.js";

/** Module-level default — stateless, so sharing a single instance is safe. */
const defaultClient = new FmClient();

// ─── Params ───────────────────────────────────────────────────────────────

/** Parameters for the {@link useFmListFiles} hook. */
export interface UseFmListFilesParams {
  /** Full-text search on title, alt_text, original_filename, uid. */
  search?: string;
  /** Page size limit (default: 25). */
  limit?: number;
  /** Page offset. */
  offset?: number;
  /** Include archived files. */
  includeArchived?: boolean;
  /** Filter by public visibility. */
  isPublic?: boolean;
  /** Sort column. */
  orderBy?: FmFilesOrderBy;
  /** Sort direction. */
  orderDirection?: "asc" | "desc";
  /** Scope to files owned by a specific user. */
  ownerUserUid?: string;
  /**
   * Include `variants` array on each file row in the response.
   * Avoids per-file API calls for variant data (e.g. image-size picker).
   */
  includeVariants?: boolean;
  /** Set to false to disable auto-fetching. Default: true. */
  enabled?: boolean;
  /** Optional FmApi implementation. Falls back to defaultFmClient. */
  api?: FmApi;
}

// ─── Result ───────────────────────────────────────────────────────────────

/** Return value of the {@link useFmListFiles} hook. */
export interface UseFmListFilesResult {
  items: FmFileListResult["items"];
  totalCount: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  error: string | null;
  /** Re-fetch the current page. */
  reload: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * React hook for paginated FM file listing with search, filtering, and sorting.
 *
 * Auto-fetches on mount and whenever inputs change. Supply `enabled: false`
 * to defer the initial fetch. Uses the provided `api` or falls back to
 * a module-level default {@link FmClient}.
 */
export const useFmListFiles = (
  params: UseFmListFilesParams = {},
): UseFmListFilesResult => {
  const enabled = params.enabled !== false;
  const api = params.api ?? defaultClient;

  const [data, setData] = useState<FmFileListResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Memoize the request object so the effect only re-runs when inputs change.
  const request = useMemo(
    () => ({
      search: params.search,
      limit: params.limit,
      offset: params.offset,
      includeArchived: params.includeArchived,
      isPublic: params.isPublic,
      orderBy: params.orderBy,
      orderDirection: params.orderDirection,
      ownerUserUid: params.ownerUserUid,
      includeVariants: params.includeVariants,
    }),
    [
      params.search,
      params.limit,
      params.offset,
      params.includeArchived,
      params.isPublic,
      params.orderBy,
      params.orderDirection,
      params.ownerUserUid,
      params.includeVariants,
    ],
  );

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }

    // Cancel any in-flight request to prevent stale responses
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const next = await api.listFiles(request);
      if (controller.signal.aborted) {
        return;
      }
      setData(next);
    } catch (e: any) {
      if (controller.signal.aborted) {
        return;
      }
      setError(e?.message || "Failed to load files");
      setData(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [enabled, api, request]);

  useEffect(() => {
    void reload();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
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
