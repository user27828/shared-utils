import type {
  EmailPreviewFixture,
  EmailTemplateCategory,
  EmailTemplateDetail,
  EmailTemplateSummary,
} from "../../../utils/src/email/types.js";

export type EmailTemplateDeliveryAddress =
  | string
  | { email: string; name?: string };

export interface EmailTemplateDescriptor<TProps = Record<string, unknown>> {
  uid: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  sendScenarios: string[];
  tags?: string[];
  from?: EmailTemplateDeliveryAddress | null;
  replyTo?: EmailTemplateDeliveryAddress | null;
  previewFixtures: EmailPreviewFixture<TProps>[];
  buildSubject(props: TProps): string;
  buildText?(props: TProps): string;
  component: unknown;
}

export interface EmailTemplateRegistry {
  list(): EmailTemplateSummary[];
  get(uid: string): EmailTemplateDescriptor<Record<string, unknown>>;
  has(uid: string): boolean;
  getDetail(uid: string): EmailTemplateDetail;
}

const toSummary = (
  descriptor: EmailTemplateDescriptor<Record<string, unknown>>,
): EmailTemplateSummary => ({
  uid: descriptor.uid,
  name: descriptor.name,
  category: descriptor.category,
  description: descriptor.description,
  sendScenarios: descriptor.sendScenarios,
  tags: descriptor.tags,
  fixtureCount: descriptor.previewFixtures.length,
});

export const createEmailTemplateRegistry = (
  descriptors: EmailTemplateDescriptor[],
): EmailTemplateRegistry => {
  const byUid = new Map<
    string,
    EmailTemplateDescriptor<Record<string, unknown>>
  >();

  for (const descriptor of descriptors) {
    if (byUid.has(descriptor.uid)) {
      throw new Error(`Duplicate email template uid: ${descriptor.uid}`);
    }

    byUid.set(
      descriptor.uid,
      descriptor as EmailTemplateDescriptor<Record<string, unknown>>,
    );
  }

  return {
    list() {
      return Array.from(byUid.values()).map((descriptor) =>
        toSummary(descriptor),
      );
    },

    get(uid: string) {
      const descriptor = byUid.get(uid);
      if (!descriptor) {
        throw new Error(`Unknown email template: ${uid}`);
      }

      return descriptor;
    },

    has(uid: string) {
      return byUid.has(uid);
    },

    getDetail(uid: string) {
      const descriptor = this.get(uid);
      return {
        ...toSummary(descriptor),
        previewFixtures: descriptor.previewFixtures.map((fixture) => ({
          uid: fixture.uid,
          label: fixture.label,
          description: fixture.description,
        })),
      };
    },
  };
};
