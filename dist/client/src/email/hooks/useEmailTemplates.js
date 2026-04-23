import { useCallback, useEffect, useMemo, useState } from "react";
import { EmailTemplateClient, } from "../EmailTemplateClient.js";
export const useEmailTemplates = (options) => {
    const clientBaseUrl = options?.clientConfig?.baseUrl;
    const clientFetchFn = options?.clientConfig?.fetchFn;
    const api = useMemo(() => {
        if (options?.api) {
            return options.api;
        }
        return new EmailTemplateClient({
            baseUrl: clientBaseUrl,
            fetchFn: clientFetchFn,
        });
    }, [clientBaseUrl, clientFetchFn, options?.api]);
    const enabled = options?.enabled !== false;
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [version, setVersion] = useState(0);
    const reload = useCallback(() => {
        setVersion((value) => value + 1);
    }, []);
    useEffect(() => {
        if (!enabled) {
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        api
            .listTemplates()
            .then((result) => {
            if (!cancelled) {
                setTemplates(result);
            }
        })
            .catch((err) => {
            if (!cancelled) {
                setError(err);
            }
        })
            .finally(() => {
            if (!cancelled) {
                setIsLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [api, enabled, version]);
    return {
        templates,
        isLoading,
        error,
        reload,
    };
};
