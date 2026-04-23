import type {
  EmailTemplateDetail,
  EmailTemplatePreviewRequest,
  EmailTemplatePreviewResponse,
  EmailTemplateSummary,
} from "../../../utils/src/email/types.js";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export class EmailTemplateClientError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "EmailTemplateClientError";
    this.statusCode = statusCode;
  }
}

export interface EmailTemplateClientConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class EmailTemplateClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config?: EmailTemplateClientConfig) {
    this.baseUrl = config?.baseUrl ?? "/api/admin/email/templates";
    this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const text = await response.text();
    let envelope: ApiEnvelope<T> | null = null;

    if (text) {
      try {
        envelope = JSON.parse(text) as ApiEnvelope<T>;
      } catch {
        throw new EmailTemplateClientError(text, response.status);
      }
    }

    if (!response.ok || !envelope?.success) {
      throw new EmailTemplateClientError(
        envelope?.error || envelope?.message || response.statusText,
        response.status,
      );
    }

    return envelope.data as T;
  }

  async listTemplates(): Promise<EmailTemplateSummary[]> {
    return this.request<EmailTemplateSummary[]>("");
  }

  async getTemplate(templateUid: string): Promise<EmailTemplateDetail> {
    return this.request<EmailTemplateDetail>(`/${encodeURIComponent(templateUid)}`);
  }

  async previewTemplate(
    templateUid: string,
    body: EmailTemplatePreviewRequest,
  ): Promise<EmailTemplatePreviewResponse> {
    return this.request<EmailTemplatePreviewResponse>(
      `/${encodeURIComponent(templateUid)}/preview`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );
  }

  async sendTestEmail(templateUid: string, fixtureUid?: string): Promise<void> {
    await this.request<void>(`/${encodeURIComponent(templateUid)}/send-test`, {
      method: "POST",
      body: JSON.stringify({ fixtureUid }),
    });
  }
}