import { getTimezoneOffset } from "./date-utils.js";
export const DEFAULT_PRIORITY_TIMEZONES = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney",
];
const normalizeTimezoneValue = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmedValue = value.trim();
    return trimmedValue || null;
};
const formatUtcOffsetLabel = (offset) => {
    if (/^[+-]\d{2}:\d{2}$/.test(offset)) {
        return `UTC${offset}`;
    }
    if (offset.startsWith("UTC")) {
        return offset;
    }
    return offset;
};
const createFriendlyTimezoneName = (timezone) => {
    return timezone
        .split("/")
        .map((part) => part.replace(/_/g, " "))
        .join(" / ");
};
const getRuntimeSupportedTimezones = () => {
    const normalizedTimezones = new Set();
    const intlWithSupportedValues = Intl;
    if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
        try {
            for (const timezone of intlWithSupportedValues.supportedValuesOf("timeZone")) {
                const normalizedTimezone = normalizeTimezoneValue(timezone);
                if (normalizedTimezone) {
                    normalizedTimezones.add(normalizedTimezone);
                }
            }
        }
        catch (_error) {
            // Fall through to resolvedOptions() fallback.
        }
    }
    const localTimezone = normalizeTimezoneValue(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (localTimezone) {
        normalizedTimezones.add(localTimezone);
    }
    return Array.from(normalizedTimezones);
};
const sortTimezones = (timezones, topTimezones) => {
    const collator = new Intl.Collator("en");
    const normalizedTopTimezones = topTimezones
        .map((timezone) => normalizeTimezoneValue(timezone))
        .filter((timezone) => Boolean(timezone));
    const priorityMap = new Map(normalizedTopTimezones.map((timezone, index) => [timezone, index]));
    return [...timezones].sort((leftTimezone, rightTimezone) => {
        const leftPriority = priorityMap.get(leftTimezone);
        const rightPriority = priorityMap.get(rightTimezone);
        if (leftPriority !== undefined || rightPriority !== undefined) {
            if (leftPriority === undefined) {
                return 1;
            }
            if (rightPriority === undefined) {
                return -1;
            }
            return leftPriority - rightPriority;
        }
        return collator.compare(leftTimezone, rightTimezone);
    });
};
export const getSupportedTimezones = ({ topTimezones = DEFAULT_PRIORITY_TIMEZONES, currentValue, } = {}) => {
    const mergedTimezones = new Set(["UTC", ...getRuntimeSupportedTimezones()]);
    const normalizedCurrentValue = normalizeTimezoneValue(currentValue);
    if (normalizedCurrentValue) {
        mergedTimezones.add(normalizedCurrentValue);
    }
    return sortTimezones(Array.from(mergedTimezones), topTimezones);
};
export const getTimezoneOptions = ({ topTimezones = DEFAULT_PRIORITY_TIMEZONES, currentValue, referenceDate = new Date(), } = {}) => {
    const runtimeTimezoneSet = new Set([
        "UTC",
        ...getRuntimeSupportedTimezones(),
    ]);
    const normalizedCurrentValue = normalizeTimezoneValue(currentValue);
    return getSupportedTimezones({
        topTimezones,
        currentValue: normalizedCurrentValue,
    }).map((timezone) => {
        const offsetLabel = formatUtcOffsetLabel(timezone === "UTC" ? "+00:00" : getTimezoneOffset(referenceDate, timezone));
        const friendlyTimezoneName = createFriendlyTimezoneName(timezone);
        const isUnknown = normalizedCurrentValue === timezone && !runtimeTimezoneSet.has(timezone);
        const secondaryLabelParts = [offsetLabel];
        if (friendlyTimezoneName !== timezone) {
            secondaryLabelParts.push(friendlyTimezoneName);
        }
        if (isUnknown) {
            secondaryLabelParts.push("Current stored value is not in the runtime-supported timezone list");
        }
        return {
            value: timezone,
            label: timezone,
            secondaryLabel: secondaryLabelParts.join(" · "),
            keywords: [timezone, friendlyTimezoneName, offsetLabel].join(" "),
            isUnknown,
        };
    });
};
