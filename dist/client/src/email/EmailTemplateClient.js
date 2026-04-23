export class EmailTemplateClientError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "EmailTemplateClientError";
        this.statusCode = statusCode;
    }
}
export class EmailTemplateClient {
    constructor(config) {
        this.baseUrl = config?.baseUrl ?? "/api/admin/email/templates";
        this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
    }
    async request(path, init) {
        const response = await this.fetchFn(`${this.baseUrl}${path}`, {
            credentials: "include",
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...init?.headers,
            },
        });
        const text = await response.text();
        let envelope = null;
        if (text) {
            try {
                envelope = JSON.parse(text);
            }
            catch {
                throw new EmailTemplateClientError(text, response.status);
            }
        }
        if (!response.ok || !envelope?.success) {
            throw new EmailTemplateClientError(envelope?.error || envelope?.message || response.statusText, response.status);
        }
        return envelope.data;
    }
    async listTemplates() {
        return this.request("");
    }
    async getTemplate(templateUid) {
        return this.request(`/${encodeURIComponent(templateUid)}`);
    }
    async previewTemplate(templateUid, body) {
        return this.request(`/${encodeURIComponent(templateUid)}/preview`, {
            method: "POST",
            body: JSON.stringify(body ?? {}),
        });
    }
    async sendTestEmail(templateUid, fixtureUid) {
        await this.request(`/${encodeURIComponent(templateUid)}/send-test`, {
            method: "POST",
            body: JSON.stringify({ fixtureUid }),
        });
    }
}
