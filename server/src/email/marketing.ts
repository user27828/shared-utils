import {
  CreateContactCommand,
  CreateContactListCommand,
  GetContactCommand,
  GetContactListCommand,
  SESv2Client,
  UpdateContactCommand,
  UpdateContactListCommand,
  type Topic as SesTopic,
  type TopicPreference as SesTopicPreference,
} from "@aws-sdk/client-sesv2";
import { log, optionsManager } from "../../../utils/index.js";
import env from "../env.js";
import { requestWithTimeout } from "./requestTimeout.js";

export type MarketingProviderName = "mailerlite" | "resend" | "ses";

export interface ResendMarketingProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
}

export interface MailerliteMarketingProviderConfig {
  enabled: boolean;
  apiKey: string;
}

export interface SesMarketingProviderConfig {
  enabled: boolean;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export interface MarketingProviderConfigs {
  mailerlite?: MailerliteMarketingProviderConfig;
  resend?: ResendMarketingProviderConfig;
  ses?: SesMarketingProviderConfig;
}

export interface MarketingSettingsInput {
  namespace?: string;
  generalAudienceKey?: string;
  sesContactListName?: string;
}

export interface ResolvedMarketingSettings {
  namespace: string;
  generalAudienceKey: string;
  sesContactListName: string;
}

export interface MarketingSyncInput {
  email: string;
  userUid?: string;
  subscribed: boolean;
  audienceKeys?: string[];
  providers: MarketingProviderConfigs;
  settings?: MarketingSettingsInput;
}

export interface MarketingSyncResult {
  provider: MarketingProviderName;
  success: boolean;
  skipped: boolean;
  message: string;
  audiences: string[];
  error?: string;
}

export interface MarketingSyncSummary {
  success: boolean;
  enabledProviders: MarketingProviderName[];
  subscribed: boolean;
  audiences: string[];
  results: MarketingSyncResult[];
}

interface ResendApiErrorData {
  name?: string;
  message?: string;
  error?: string;
}

class ResendApiError extends Error {
  readonly status: number;

  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ResendApiError";
    this.status = status;
    this.data = data;
  }
}

interface MailerliteApiErrorData {
  message?: string;
  error?: string;
}

class MailerliteApiError extends Error {
  readonly status: number;

  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "MailerliteApiError";
    this.status = status;
    this.data = data;
  }
}

interface ResendTopicRecord {
  id: string;
  name: string;
  description?: string;
  default_subscription?: "opt_in" | "opt_out";
  visibility?: "public" | "private";
}

interface ResendListResponse<T> {
  object?: string;
  has_more?: boolean;
  data: T[];
}

interface MailerliteGroupRecord {
  id: string;
  name: string;
}

interface MailerliteListGroupsResponse {
  data?: MailerliteGroupRecord[];
  meta?: {
    last_page?: number;
  };
}

interface MailerliteCreateGroupResponse {
  data?: MailerliteGroupRecord;
}

interface MailerliteSubscriberResponse {
  data?: {
    id?: string;
  };
}

type SesMarketingRuntime = Pick<SESv2Client, "send" | "destroy">;

export interface MarketingRuntimeOverrides {
  createSesClient?: (config: SesMarketingProviderConfig) => SesMarketingRuntime;
}

interface SesContactListState {
  exists: boolean;
  topics: SesTopic[];
}

const DEFAULT_MARKETING_NAMESPACE = "agentm";
const DEFAULT_GENERAL_AUDIENCE_KEY = "general";
const RESEND_DEFAULT_BASE_URL = "https://api.resend.com";
const MAILERLITE_DEFAULT_BASE_URL = "https://connect.mailerlite.com";
const MARKETING_NAME_MAX = 50;
const SES_CONTACT_LIST_NAME_MAX = 64;

const trimString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const getOptionalEnv = (key: string): string | undefined => {
  return (
    trimString(optionsManager.getOption("ENV", key)) || trimString(env[key])
  );
};

const slugifyAudienceKey = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || DEFAULT_GENERAL_AUDIENCE_KEY;
};

const unique = <T>(values: T[]): T[] => {
  return Array.from(new Set(values));
};

export const resolveMarketingSettings = (
  settings?: MarketingSettingsInput,
): ResolvedMarketingSettings => {
  const namespace =
    slugifyAudienceKey(
      settings?.namespace ||
        getOptionalEnv("EMAIL_MARKETING_NAMESPACE") ||
        DEFAULT_MARKETING_NAMESPACE,
    ).slice(0, MARKETING_NAME_MAX) || DEFAULT_MARKETING_NAMESPACE;

  const generalAudienceKey =
    slugifyAudienceKey(
      settings?.generalAudienceKey ||
        getOptionalEnv("EMAIL_MARKETING_GENERAL_KEY") ||
        DEFAULT_GENERAL_AUDIENCE_KEY,
    ) || DEFAULT_GENERAL_AUDIENCE_KEY;

  const sesContactListName =
    slugifyAudienceKey(
      settings?.sesContactListName ||
        getOptionalEnv("EMAIL_SES_MARKETING_CONTACT_LIST_NAME") ||
        `${namespace}-newsletter`,
    ).slice(0, SES_CONTACT_LIST_NAME_MAX) || `${namespace}-newsletter`;

  return {
    namespace,
    generalAudienceKey,
    sesContactListName,
  };
};

export const resolveManagedAudienceKeys = (args: {
  subscribed: boolean;
  audienceKeys?: string[];
  settings?: MarketingSettingsInput;
}): string[] => {
  const settings = resolveMarketingSettings(args.settings);

  if (!args.subscribed) {
    return [];
  }

  return unique([
    settings.generalAudienceKey,
    ...(args.audienceKeys || []).map((audienceKey) => {
      return slugifyAudienceKey(audienceKey);
    }),
  ]);
};

const buildManagedAudienceName = (
  settings: ResolvedMarketingSettings,
  audienceKey: string,
): string => {
  return `${settings.namespace}-${slugifyAudienceKey(audienceKey)}`.slice(
    0,
    MARKETING_NAME_MAX,
  );
};

const buildAudienceDisplayName = (audienceKey: string): string => {
  const normalized = slugifyAudienceKey(audienceKey);
  if (normalized === DEFAULT_GENERAL_AUDIENCE_KEY) {
    return "General Newsletter";
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((segment) => {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
};

const isManagedAudienceName = (
  settings: ResolvedMarketingSettings,
  value: string | undefined,
): boolean => {
  return Boolean(value && value.startsWith(`${settings.namespace}-`));
};

const buildSesClient = (
  config: SesMarketingProviderConfig,
): SesMarketingRuntime => {
  const clientConfig: ConstructorParameters<typeof SESv2Client>[0] = {
    region: config.region,
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
    };
  }

  return new SESv2Client(clientConfig);
};

const isResendAlreadyExistsError = (error: unknown): boolean => {
  if (!(error instanceof ResendApiError)) {
    return false;
  }

  if (error.status === 409) {
    return true;
  }

  const data = error.data as ResendApiErrorData | undefined;
  const combinedMessage =
    `${error.message} ${data?.message || ""}`.toLowerCase();
  return (
    combinedMessage.includes("already") && combinedMessage.includes("exist")
  );
};

const isMailerliteAlreadyExistsError = (error: unknown): boolean => {
  if (!(error instanceof MailerliteApiError)) {
    return false;
  }

  if (error.status === 409) {
    return true;
  }

  const data = error.data as MailerliteApiErrorData | undefined;
  const combinedMessage =
    `${error.message} ${data?.message || ""} ${data?.error || ""}`.toLowerCase();

  return (
    combinedMessage.includes("already") && combinedMessage.includes("exist")
  );
};

const isSesAlreadyExistsError = (error: unknown): boolean => {
  return (error as { name?: string } | undefined)?.name === "AlreadyExistsException";
};

const parseApiResponse = async (response: Response): Promise<unknown> => {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
};

const resendRequest = async <T>(
  config: ResendMarketingProviderConfig,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await requestWithTimeout("Resend", async (signal) => {
    return fetch(`${config.baseUrl || RESEND_DEFAULT_BASE_URL}${path}`, {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });
  });

  const parsed = await parseApiResponse(response);
  if (!response.ok) {
    const parsedError = parsed as ResendApiErrorData | undefined;
    const message =
      parsedError?.message ||
      parsedError?.error ||
      response.statusText ||
      `Resend API request failed with status ${response.status}`;
    throw new ResendApiError(response.status, message, parsed);
  }

  return parsed as T;
};

const mailerliteRequest = async <T>(
  config: MailerliteMarketingProviderConfig,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await requestWithTimeout("MailerLite", async (signal) => {
    return fetch(`${MAILERLITE_DEFAULT_BASE_URL}${path}`, {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });
  });

  const parsed = await parseApiResponse(response);
  if (!response.ok) {
    const parsedError = parsed as MailerliteApiErrorData | undefined;
    const message =
      parsedError?.message ||
      parsedError?.error ||
      response.statusText ||
      `MailerLite API request failed with status ${response.status}`;
    throw new MailerliteApiError(response.status, message, parsed);
  }

  return parsed as T;
};

type ActiveMarketingRuntime = Required<MarketingRuntimeOverrides>;

const defaultMarketingRuntime: ActiveMarketingRuntime = {
  createSesClient: (config) => {
    return buildSesClient(config);
  },
};

let marketingRuntime: ActiveMarketingRuntime = defaultMarketingRuntime;

export const setMarketingRuntimeOverrides = (
  overrides: MarketingRuntimeOverrides,
): void => {
  marketingRuntime = {
    ...defaultMarketingRuntime,
    ...overrides,
  };
};

export const resetMarketingRuntimeOverrides = (): void => {
  marketingRuntime = defaultMarketingRuntime;
};

const listAllResendTopics = async (
  config: ResendMarketingProviderConfig,
): Promise<ResendTopicRecord[]> => {
  const topics: ResendTopicRecord[] = [];
  let after: string | undefined;

  while (true) {
    const params = new URLSearchParams({ limit: "100" });
    if (after) {
      params.set("after", after);
    }

    const response = await resendRequest<ResendListResponse<ResendTopicRecord>>(
      config,
      `/topics?${params.toString()}`,
      { method: "GET" },
    );

    const page = Array.isArray(response.data) ? response.data : [];
    topics.push(...page);

    if (!response.has_more || page.length === 0) {
      return topics;
    }

    after = page[page.length - 1]?.id;
    if (!after) {
      return topics;
    }
  }
};

const findResendTopicByName = async (
  config: ResendMarketingProviderConfig,
  topicName: string,
): Promise<ResendTopicRecord | undefined> => {
  const topics = await listAllResendTopics(config);
  return topics.find((topic) => topic.name === topicName);
};

const ensureResendTopics = async (
  config: ResendMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
  audienceKeys: string[],
): Promise<ResendTopicRecord[]> => {
  const existingTopics = await listAllResendTopics(config);
  const topicsByName = new Map(
    existingTopics.map((topic) => [topic.name, topic]),
  );

  for (const audienceKey of audienceKeys) {
    const topicName = buildManagedAudienceName(settings, audienceKey);
    if (topicsByName.has(topicName)) {
      continue;
    }

    try {
      const created = await resendRequest<{ id: string }>(config, "/topics", {
        method: "POST",
        body: JSON.stringify({
          name: topicName,
          defaultSubscription: "opt_out",
          visibility: "private",
          description: `${buildAudienceDisplayName(audienceKey)} managed by AgentM.Resume`,
        }),
      });

      topicsByName.set(topicName, {
        id: created.id,
        name: topicName,
        default_subscription: "opt_out",
        visibility: "private",
      });
    } catch (error) {
      if (!isResendAlreadyExistsError(error)) {
        throw error;
      }

      const existingTopic = await findResendTopicByName(config, topicName);
      if (!existingTopic) {
        throw error;
      }

      topicsByName.set(existingTopic.name, existingTopic);
    }
  }

  return Array.from(topicsByName.values());
};

const syncResendMarketing = async (
  config: ResendMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
  input: MarketingSyncInput,
  requestedAudienceKeys: string[],
): Promise<MarketingSyncResult> => {
  const requestedAudienceNames = new Set(
    requestedAudienceKeys.map((key) => buildManagedAudienceName(settings, key)),
  );

  const topics = await ensureResendTopics(
    config,
    settings,
    requestedAudienceKeys,
  );
  const managedTopics = topics.filter((topic) => {
    return isManagedAudienceName(settings, topic.name);
  });

  try {
    await resendRequest(config, "/contacts", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        unsubscribed: !input.subscribed,
      }),
    });
  } catch (error) {
    if (!isResendAlreadyExistsError(error)) {
      throw error;
    }

    await resendRequest(
      config,
      `/contacts/${encodeURIComponent(input.email)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          unsubscribed: !input.subscribed,
        }),
      },
    );
  }

  if (managedTopics.length > 0) {
    await resendRequest(
      config,
      `/contacts/${encodeURIComponent(input.email)}/topics`,
      {
        method: "PATCH",
        body: JSON.stringify({
          topics: managedTopics.map((topic) => ({
            id: topic.id,
            subscription:
              input.subscribed && requestedAudienceNames.has(topic.name)
                ? "opt_in"
                : "opt_out",
          })),
        }),
      },
    );
  }

  return {
    provider: "resend",
    success: true,
    skipped: false,
    message: input.subscribed
      ? "Resend contact and topics synchronized."
      : "Resend contact unsubscribed.",
    audiences: requestedAudienceKeys,
  };
};

const listManagedMailerliteGroups = async (
  config: MailerliteMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
): Promise<Array<{ id: string; name: string }>> => {
  const groups: Array<{ id: string; name: string }> = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: "100",
      page: String(page),
      sort: "name",
    });
    const response = await mailerliteRequest<MailerliteListGroupsResponse>(
      config,
      `/api/groups?${params.toString()}`,
      { method: "GET" },
    );

    const pageGroups = response.data || [];
    groups.push(
      ...pageGroups
        .filter((group) => isManagedAudienceName(settings, group.name))
        .map((group) => ({ id: group.id, name: group.name })),
    );

    const lastPage = response.meta?.last_page || page;
    if (page >= lastPage) {
      return groups;
    }

    page += 1;
  }
};

const findMailerliteGroupByName = async (
  config: MailerliteMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
  groupName: string,
): Promise<{ id: string; name: string } | undefined> => {
  const groups = await listManagedMailerliteGroups(config, settings);
  return groups.find((group) => group.name === groupName);
};

const ensureMailerliteGroups = async (
  config: MailerliteMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
  audienceKeys: string[],
): Promise<Array<{ id: string; name: string }>> => {
  const managedGroups = await listManagedMailerliteGroups(config, settings);
  const groupsByName = new Map(
    managedGroups.map((group) => [group.name, group]),
  );

  for (const audienceKey of audienceKeys) {
    const groupName = buildManagedAudienceName(settings, audienceKey);
    if (groupsByName.has(groupName)) {
      continue;
    }

    try {
      const response = await mailerliteRequest<MailerliteCreateGroupResponse>(
        config,
        "/api/groups",
        {
          method: "POST",
          body: JSON.stringify({ name: groupName }),
        },
      );
      const createdGroup = response.data;
      if (createdGroup?.id && createdGroup.name) {
        groupsByName.set(createdGroup.name, {
          id: createdGroup.id,
          name: createdGroup.name,
        });
      }
    } catch (error) {
      if (!isMailerliteAlreadyExistsError(error)) {
        throw error;
      }

      const existingGroup = await findMailerliteGroupByName(
        config,
        settings,
        groupName,
      );
      if (!existingGroup) {
        throw error;
      }

      groupsByName.set(existingGroup.name, existingGroup);
    }
  }

  return Array.from(groupsByName.values());
};

const syncMailerliteMarketing = async (
  config: MailerliteMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
  input: MarketingSyncInput,
  requestedAudienceKeys: string[],
): Promise<MarketingSyncResult> => {
  const managedGroups = await ensureMailerliteGroups(
    config,
    settings,
    requestedAudienceKeys,
  );
  const requestedGroupIds = managedGroups
    .filter((group) => {
      return requestedAudienceKeys.some((audienceKey) => {
        return group.name === buildManagedAudienceName(settings, audienceKey);
      });
    })
    .map((group) => group.id);

  const response = await mailerliteRequest<MailerliteSubscriberResponse>(
    config,
    "/api/subscribers",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        status: input.subscribed ? "active" : "unsubscribed",
        ...(input.subscribed ? { groups: requestedGroupIds } : {}),
        ...(input.subscribed
          ? {
              subscribed_at: new Date().toISOString(),
              opted_in_at: new Date().toISOString(),
            }
          : {
              unsubscribed_at: new Date().toISOString(),
            }),
      }),
    },
  );

  const subscriberId = response.data?.id;
  const groupSyncErrors: string[] = [];

  if (subscriberId) {
    for (const groupId of requestedGroupIds) {
      try {
        await mailerliteRequest(
          config,
          `/api/subscribers/${encodeURIComponent(subscriberId)}/groups/${encodeURIComponent(groupId)}`,
          { method: "POST" },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        groupSyncErrors.push(`assign ${groupId}: ${errorMessage}`);
        log.warn?.("MailerliteMarketing: assign subscriber failed", {
          email: input.email,
          groupId,
          error: errorMessage,
        });
      }
    }

    for (const group of managedGroups) {
      if (requestedGroupIds.includes(group.id)) {
        continue;
      }

      try {
        await mailerliteRequest(
          config,
          `/api/subscribers/${encodeURIComponent(subscriberId)}/groups/${encodeURIComponent(group.id)}`,
          { method: "DELETE" },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        groupSyncErrors.push(`unassign ${group.id}: ${errorMessage}`);
        log.warn?.("MailerliteMarketing: unassign subscriber failed", {
          email: input.email,
          groupId: group.id,
          error: errorMessage,
        });
      }
    }
  } else if (managedGroups.length > 0) {
    groupSyncErrors.push("subscriber update did not return a subscriber id");
  }

  if (groupSyncErrors.length > 0) {
    throw new Error(
      `MailerLite group sync failed: ${groupSyncErrors.join("; ")}`,
    );
  }

  return {
    provider: "mailerlite",
    success: true,
    skipped: false,
    message: input.subscribed
      ? "MailerLite subscriber and groups synchronized."
      : "MailerLite subscriber unsubscribed.",
    audiences: requestedAudienceKeys,
  };
};

const buildSesTopicDefinition = (topicName: string): SesTopic => {
  return {
    TopicName: topicName,
    DisplayName: buildAudienceDisplayName(topicName.replace(/^[^-]+-/, "")),
    DefaultSubscriptionStatus: "OPT_OUT",
    Description: `${topicName} managed by AgentM.Resume`,
  };
};

const ensureSesContactList = async (
  client: SesMarketingRuntime,
  settings: ResolvedMarketingSettings,
  requestedAudienceKeys: string[],
): Promise<SesContactListState> => {
  const requestedTopicNames = requestedAudienceKeys.map((audienceKey) => {
    return buildManagedAudienceName(settings, audienceKey);
  });

  let existingTopics: SesTopic[] = [];

  try {
    const response = await client.send(
      new GetContactListCommand({
        ContactListName: settings.sesContactListName,
      }),
    );

    existingTopics = response.Topics || [];
  } catch (error) {
    const sesError = error as { name?: string };
    if (sesError.name !== "NotFoundException") {
      throw error;
    }

    if (requestedTopicNames.length === 0) {
      return {
        exists: false,
        topics: [],
      };
    }

    const topics = requestedTopicNames.map(buildSesTopicDefinition);
    try {
      await client.send(
        new CreateContactListCommand({
          ContactListName: settings.sesContactListName,
          Description: "Managed by AgentM.Resume marketing sync",
          Topics: topics,
        }),
      );

      return {
        exists: true,
        topics,
      };
    } catch (createError) {
      if (!isSesAlreadyExistsError(createError)) {
        throw createError;
      }

      const existingState = await client.send(
        new GetContactListCommand({
          ContactListName: settings.sesContactListName,
        }),
      );
      existingTopics = existingState.Topics || [];
    }
  }

  const topicsByName = new Map(
    existingTopics.map((topic) => [topic.TopicName || "", topic]),
  );
  let changed = false;

  for (const topicName of requestedTopicNames) {
    if (topicsByName.has(topicName)) {
      continue;
    }

    topicsByName.set(topicName, buildSesTopicDefinition(topicName));
    changed = true;
  }

  const mergedTopics = Array.from(topicsByName.values()).filter((topic) => {
    return Boolean(topic.TopicName && topic.DisplayName);
  });

  if (changed) {
    await client.send(
      new UpdateContactListCommand({
        ContactListName: settings.sesContactListName,
        Description: "Managed by AgentM.Resume marketing sync",
        Topics: mergedTopics,
      }),
    );
  }

  return {
    exists: true,
    topics: mergedTopics,
  };
};

const syncSesMarketing = async (
  config: SesMarketingProviderConfig,
  settings: ResolvedMarketingSettings,
  input: MarketingSyncInput,
  requestedAudienceKeys: string[],
): Promise<MarketingSyncResult> => {
  const client = marketingRuntime.createSesClient(config);

  try {
    const contactList = await ensureSesContactList(
      client,
      settings,
      requestedAudienceKeys,
    );

    if (!contactList.exists && !input.subscribed) {
      return {
        provider: "ses",
        success: true,
        skipped: true,
        message: "No SES contact list existed to unsubscribe.",
        audiences: [],
      };
    }

    const managedTopicNames = contactList.topics
      .map((topic) => topic.TopicName || "")
      .filter((topicName) => isManagedAudienceName(settings, topicName));
    const requestedTopicNames = new Set(
      requestedAudienceKeys.map((audienceKey) => {
        return buildManagedAudienceName(settings, audienceKey);
      }),
    );

    let contactExists = false;
    try {
      await client.send(
        new GetContactCommand({
          ContactListName: settings.sesContactListName,
          EmailAddress: input.email,
        }),
      );
      contactExists = true;
    } catch (error) {
      const sesError = error as { name?: string };
      if (sesError.name !== "NotFoundException") {
        throw error;
      }
    }

    if (!contactExists && !input.subscribed) {
      return {
        provider: "ses",
        success: true,
        skipped: true,
        message: "No SES contact existed to unsubscribe.",
        audiences: [],
      };
    }

    const topicPreferences: SesTopicPreference[] = managedTopicNames.map(
      (topicName) => ({
        TopicName: topicName,
        SubscriptionStatus:
          input.subscribed && requestedTopicNames.has(topicName)
            ? "OPT_IN"
            : "OPT_OUT",
      }),
    );

    const commandInput = {
      ContactListName: settings.sesContactListName,
      EmailAddress: input.email,
      ...(topicPreferences.length > 0
        ? { TopicPreferences: topicPreferences }
        : {}),
      UnsubscribeAll: !input.subscribed,
    };

    if (contactExists) {
      await client.send(new UpdateContactCommand(commandInput));
    } else {
      await client.send(new CreateContactCommand(commandInput));
    }

    return {
      provider: "ses",
      success: true,
      skipped: false,
      message: input.subscribed
        ? "SES contact list and topics synchronized."
        : "SES contact unsubscribed.",
      audiences: requestedAudienceKeys,
    };
  } finally {
    client.destroy();
  }
};

const toFailureResult = (
  provider: MarketingProviderName,
  message: string,
  audiences: string[],
): MarketingSyncResult => {
  return {
    provider,
    success: false,
    skipped: false,
    message,
    audiences,
    error: message,
  };
};

export const syncMarketingSubscriptions = async (
  input: MarketingSyncInput,
): Promise<MarketingSyncSummary> => {
  const settings = resolveMarketingSettings(input.settings);
  const audiences = resolveManagedAudienceKeys({
    subscribed: input.subscribed,
    audienceKeys: input.audienceKeys,
    settings,
  });
  const results: MarketingSyncResult[] = [];

  const enabledProviders: MarketingProviderName[] = [];
  if (input.providers.mailerlite?.enabled) {
    enabledProviders.push("mailerlite");
  }
  if (input.providers.resend?.enabled) {
    enabledProviders.push("resend");
  }
  if (input.providers.ses?.enabled) {
    enabledProviders.push("ses");
  }

  for (const provider of enabledProviders) {
    try {
      if (provider === "mailerlite" && input.providers.mailerlite) {
        results.push(
          await syncMailerliteMarketing(
            input.providers.mailerlite,
            settings,
            input,
            audiences,
          ),
        );
        continue;
      }

      if (provider === "resend" && input.providers.resend) {
        results.push(
          await syncResendMarketing(
            input.providers.resend,
            settings,
            input,
            audiences,
          ),
        );
        continue;
      }

      if (provider === "ses" && input.providers.ses) {
        results.push(
          await syncSesMarketing(
            input.providers.ses,
            settings,
            input,
            audiences,
          ),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error?.("EmailMarketing: Provider sync failed", {
        provider,
        email: input.email,
        userUid: input.userUid,
        error: message,
      });
      results.push(toFailureResult(provider, message, audiences));
    }
  }

  if (enabledProviders.length === 0) {
    return {
      success: true,
      enabledProviders: [],
      subscribed: input.subscribed,
      audiences,
      results: [],
    };
  }

  return {
    success: results.every((result) => result.success || result.skipped),
    enabledProviders,
    subscribed: input.subscribed,
    audiences,
    results,
  };
};
