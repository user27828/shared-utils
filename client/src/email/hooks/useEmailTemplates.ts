import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmailTemplateSummary } from "../../../../utils/src/email/types.js";
import {
  EmailTemplateClient,
  type EmailTemplateClientConfig,
} from "../EmailTemplateClient.js";

export interface UseEmailTemplatesOptions {
  api?: EmailTemplateClient;
  clientConfig?: EmailTemplateClientConfig;
  enabled?: boolean;
}

export interface UseEmailTemplatesResult {
  templates: EmailTemplateSummary[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export const useEmailTemplates = (
  options?: UseEmailTemplatesOptions,
): UseEmailTemplatesResult => {
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
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
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
      .catch((err: Error) => {
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