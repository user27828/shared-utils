/**
 * CMS Public Hook — shared-utils
 *
 * React hook for fetching public CMS content.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { CmsPublicPayload } from "../../../../utils/src/cms/types.js";
import type { CmsApi } from "../CmsApi.js";
import { CmsClient } from "../CmsClient.js";

export interface UseCmsPublicOptions {
  postType: string;
  locale: string;
  slug: string;
  unlockToken?: string;
  /** Provide a custom CmsApi instance. Defaults to a new CmsClient(). */
  api?: CmsApi;
  /** Set to false to disable auto-fetching. Default: true. */
  enabled?: boolean;
}

export interface UseCmsPublicResult {
  data: CmsPublicPayload | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

const defaultClient = new CmsClient();

export const useCmsPublic = (
  params: UseCmsPublicOptions,
): UseCmsPublicResult => {
  const api = params.api ?? defaultClient;
  const enabled = params.enabled !== false;

  const [data, setData] = useState<CmsPublicPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // Memoize request params to avoid re-fetches on referential changes
  const memoParams = useMemo(
    () => ({
      postType: params.postType,
      locale: params.locale,
      slug: params.slug,
      unlockToken: params.unlockToken,
    }),
    [params.postType, params.locale, params.slug, params.unlockToken],
  );

  useEffect(() => {
    if (!enabled || !memoParams.postType || !memoParams.locale || !memoParams.slug) {
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    api
      .publicGet(memoParams)
      .then((result: CmsPublicPayload) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(result);
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
    memoParams.postType,
    memoParams.locale,
    memoParams.slug,
    memoParams.unlockToken,
    api,
  ]);

  return { data, isLoading, error, reload };
};
