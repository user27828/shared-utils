import { SESv2Client } from "@aws-sdk/client-sesv2";
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
type SesMarketingRuntime = Pick<SESv2Client, "send" | "destroy">;
export interface MarketingRuntimeOverrides {
    createSesClient?: (config: SesMarketingProviderConfig) => SesMarketingRuntime;
}
export declare const resolveMarketingSettings: (settings?: MarketingSettingsInput) => ResolvedMarketingSettings;
export declare const resolveManagedAudienceKeys: (args: {
    subscribed: boolean;
    audienceKeys?: string[];
    settings?: MarketingSettingsInput;
}) => string[];
export declare const setMarketingRuntimeOverrides: (overrides: MarketingRuntimeOverrides) => void;
export declare const resetMarketingRuntimeOverrides: () => void;
export declare const syncMarketingSubscriptions: (input: MarketingSyncInput) => Promise<MarketingSyncSummary>;
export {};
//# sourceMappingURL=marketing.d.ts.map