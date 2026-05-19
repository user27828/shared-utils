export interface TimezoneOption {
    value: string;
    label: string;
    secondaryLabel: string;
    keywords: string;
    isUnknown?: boolean;
}
export interface GetTimezoneOptionsArgs {
    topTimezones?: string[];
    currentValue?: string | null;
    referenceDate?: Date;
}
export declare const DEFAULT_PRIORITY_TIMEZONES: string[];
export declare const getSupportedTimezones: ({ topTimezones, currentValue, }?: Pick<GetTimezoneOptionsArgs, "topTimezones" | "currentValue">) => string[];
export declare const getTimezoneOptions: ({ topTimezones, currentValue, referenceDate, }?: GetTimezoneOptionsArgs) => TimezoneOption[];
//# sourceMappingURL=timezones.d.ts.map