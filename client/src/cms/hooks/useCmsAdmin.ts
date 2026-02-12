/**
 * CMS Admin Hook — shared-utils
 *
 * React hook for admin CMS list operations.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CmsHeadRow,
  CmsListResponse,
} from "../../../../utils/src/cms/types.js";
import type { CmsApi, CmsAdminListParams } from "../CmsApi.js";
import { CmsClient } from "../CmsClient.js";

export interface UseCmsAdminOptions extends CmsAdminListParams {
  /** Provide a custom CmsApi instance. Defaults to a new CmsClient(). */
  api?: CmsApi;
  /** Set to false to disable auto-fetching. Default: true. */
  enabled?: boolean;
}

export interface UseCmsAdminResult {
  items: CmsHeadRow[];
  totalCount: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

const defaultClient = new CmsClient();

export const useCmsAdmin = (
  params?: UseCmsAdminOptions,
): UseCmsAdminResult => {
  const api = params?.api ?? defaultClient;
  const enabled = params?.enabled !== false;

  const [items, setItems] = useState<CmsHeadRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const listParams: CmsAdminListParams = {};
    if (params?.q !== undefined) {
      listParams.q = params.q;
    }
    if (params?.status !== undefined) {
      listParams.status = params.status;
    }
    if (params?.post_type !== undefined) {
      listParams.post_type = params.post_type;
    }
    if (params?.locale !== undefined) {
      listParams.locale = params.locale;
    }
    if (params?.tag !== undefined) {
      listParams.tag = params.tag;
    }
    if (params?.limit !== undefined) {
      listParams.limit = params.limit;
    }
    if (params?.offset !== undefined) {
      listParams.offset = params.offset;
    }
    if (params?.orderBy !== undefined) {
      listParams.orderBy = params.orderBy;
    }
    if (params?.orderDirection !== undefined) {
      listParams.orderDirection = params.orderDirection;
    }
    if (params?.includeTrash !== undefined) {
      listParams.includeTrash = params.includeTrash;
    }

    api
      .adminList(listParams)
      .then((result: CmsListResponse) => {
        if (controller.signal.aborted) {
          return;
        }
        setItems(result.items);
        setTotalCount(result.totalCount);
        setLimit(result.limit);
        setOffset(result.offset);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    enabled,
    version,
    params?.q,
    params?.status,
    params?.post_type,
    params?.locale,
    params?.tag,
    params?.limit,
    params?.offset,
    params?.orderBy,
    params?.orderDirection,
    params?.includeTrash,
    api,
  ]);

  return { items, totalCount, limit, offset, isLoading, error, reload };
};
