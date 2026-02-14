/**
 * CMS Public Hook — shared-utils
 *
 * React hook for fetching public CMS content.
 * Handles ETag/304 caching, password-protected content, and
 * discriminated-union results from CmsApi.publicGet().
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { CmsClient } from "../CmsClient.js";
const defaultClient = new CmsClient();
export const useCmsPublic = (params) => {
    const api = params.api ?? defaultClient;
    const enabled = params.enabled !== false;
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [etag, setEtag] = useState(null);
    const [version, setVersion] = useState(0);
    const abortRef = useRef(null);
    const reload = useCallback(() => {
        setVersion((v) => v + 1);
    }, []);
    // Memoize request params to avoid re-fetches on referential changes
    const memoParams = useMemo(() => ({
        postType: params.postType,
        locale: params.locale,
        slug: params.slug,
        unlockToken: params.unlockToken,
    }), [params.postType, params.locale, params.slug, params.unlockToken]);
    useEffect(() => {
        if (!enabled ||
            !memoParams.postType ||
            !memoParams.locale ||
            !memoParams.slug) {
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
            .publicGet({ ...memoParams, ifNoneMatch: etag ?? undefined })
            .then((result) => {
            if (controller.signal.aborted) {
                return;
            }
            switch (result.kind) {
                case "ok":
                    setData(result.data);
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
            .catch((err) => {
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
        etag,
        api,
    ]);
    return { data, isLoading, error, requiresPassword, etag, reload };
};
