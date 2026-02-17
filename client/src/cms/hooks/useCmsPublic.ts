/**
 * CMS Public Hook — shared-utils
 *
 * React hook for fetching public CMS content.
 * Handles ETag/304 caching, password-protected content, and
 * discriminated-union results from CmsApi.publicGet().
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
  /** If true, request an authenticated draft preview (requires server support). */
  preview?: boolean;
  /** Provide a custom CmsApi instance. Defaults to a new CmsClient(). */
  api?: CmsApi;
  /** Set to false to disable auto-fetching. Default: true. */
  enabled?: boolean;
}

export interface UseCmsPublicResult {
  data: CmsPublicPayload | null;
  isLoading: boolean;
  error: Error | null;
  /** True when the server indicates the content is password-protected. */
  requiresPassword: boolean;
  /** Current ETag for conditional requests. */
  etag: string | null;
  /** Force a refetch. */
  reload: () => void;
}

const defaultClient = new CmsClient();

export const useCmsPublic = (
  params: UseCmsPublicOptions,
): UseCmsPublicResult => {
  const api = params.api ?? defaultClient;
  const enabled = params.enabled !== false;

  // NOTE: do not memoize with [] — in SSR environments `window` is undefined
  // during the initial render, and we'd incorrectly freeze `preview=false`.
  const previewFromUrl = (() => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      const sp = new URLSearchParams(window.location.search);
      const v = String(sp.get("preview") ?? "").toLowerCase();
      return v === "1" || v === "true" || v === "yes";
    } catch {
      return false;
    }
  })();

  const preview =
    params.preview !== undefined ? Boolean(params.preview) : previewFromUrl;

  const [data, setData] = useState<CmsPublicPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [etag, setEtag] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const etagRef = useRef<string | null>(null);

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
      preview,
    }),
    [params.postType, params.locale, params.slug, params.unlockToken, preview],
  );

  // Reset cached etag when the page identity changes
  useEffect(() => {
    etagRef.current = null;
    setEtag(null);
  }, [memoParams.postType, memoParams.locale, memoParams.slug]);

  useEffect(() => {
    if (
      !enabled ||
      !memoParams.postType ||
      !memoParams.locale ||
      !memoParams.slug
    ) {
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    // Read etag from ref (not state) to avoid re-triggering the effect
    const currentEtag = etagRef.current;

    api
      .publicGet({ ...memoParams, ifNoneMatch: currentEtag ?? undefined })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        switch (result.kind) {
          case "ok":
            setData(result.data);
            etagRef.current = result.etag ?? null;
            setEtag(result.etag);
            setRequiresPassword(false);
            break;
          case "not_modified":
            // Data already cached — nothing to update.
            break;
          case "password_required":
            setRequiresPassword(true);
            break;
          case "not_found":
            setData(null);
            setRequiresPassword(false);
            setError(new Error(result.message));
            break;
          case "error":
            setData(null);
            setRequiresPassword(false);
            setError(new Error(result.message));
            break;
        }
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

  return { data, isLoading, error, requiresPassword, etag, reload };
};
