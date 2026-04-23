import { useCallback, useEffect, useMemo, useState } from "react";
import { EmailTemplateClient, } from "../EmailTemplateClient.js";
export const useEmailTemplatePreview = (options) => {
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
    const templateUid = options?.templateUid ?? null;
    const enabled = options?.enabled !== false && Boolean(templateUid);
    const [template, setTemplate] = useState(null);
    const [preview, setPreview] = useState(null);
    const [selectedFixtureUid, setSelectedFixtureUid] = useState(options?.initialFixtureUid ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [error, setError] = useState(null);
    const [version, setVersion] = useState(0);
    useEffect(() => {
        setSelectedFixtureUid(options?.initialFixtureUid ?? null);
    }, [options?.initialFixtureUid, templateUid]);
    const reload = useCallback(() => {
        setVersion((value) => value + 1);
    }, []);
    const setFixtureUid = useCallback((fixtureUid) => {
        setSelectedFixtureUid(fixtureUid);
    }, []);
    const sendTestEmail = useCallback(async () => {
        if (!templateUid) {
            return;
        }
        setIsSendingTest(true);
        try {
            await api.sendTestEmail(templateUid, selectedFixtureUid ?? undefined);
        }
        finally {
            setIsSendingTest(false);
        }
    }, [api, selectedFixtureUid, templateUid]);
    useEffect(() => {
        if (!enabled || !templateUid) {
            setTemplate(null);
            setPreview(null);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        Promise.all([
            api.getTemplate(templateUid),
            api.previewTemplate(templateUid, {
                fixtureUid: selectedFixtureUid,
            }),
        ])
            .then(([nextTemplate, nextPreview]) => {
            if (cancelled) {
                return;
            }
            setTemplate(nextTemplate);
            setPreview(nextPreview);
            if (nextPreview.fixtureUid &&
                nextPreview.fixtureUid !== selectedFixtureUid) {
                setSelectedFixtureUid(nextPreview.fixtureUid);
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
    }, [api, enabled, selectedFixtureUid, templateUid, version]);
    return {
        template,
        preview,
        selectedFixtureUid,
        setFixtureUid,
        isLoading,
        isSendingTest,
        error,
        reload,
        sendTestEmail,
    };
};
