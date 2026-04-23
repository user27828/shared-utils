export type EmailTemplateCategory =
  | "auth"
  | "transactional"
  | "notification"
  | "marketing"
  | "system"
  | "other";

export interface EmailTemplateSummary {
  uid: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  sendScenarios: string[];
  tags?: string[];
  fixtureCount: number;
}

export interface EmailTemplateFixtureSummary {
  uid: string;
  label: string;
  description?: string;
}

export interface EmailTemplateDetail extends EmailTemplateSummary {
  previewFixtures: EmailTemplateFixtureSummary[];
}

export interface EmailPreviewFixture<TProps = Record<string, unknown>> {
  uid: string;
  label: string;
  description?: string;
  props: TProps;
}

export interface EmailRenderWarnings {
  usedGeneratedText?: boolean;
  missingExplicitTextRenderer?: boolean;
}

export interface EmailRenderResult {
  subject: string;
  html: string;
  text: string;
  warnings?: EmailRenderWarnings;
  metadata?: Record<string, unknown>;
}

export interface EmailTemplatePreviewRequest {
  fixtureUid?: string | null;
  propsOverride?: Record<string, unknown> | null;
}

export interface EmailTemplatePreviewResponse {
  template: EmailTemplateSummary;
  fixtureUid: string | null;
  subject: string;
  html: string;
  text: string;
  warnings?: EmailRenderWarnings;
  metadata?: Record<string, unknown>;
}