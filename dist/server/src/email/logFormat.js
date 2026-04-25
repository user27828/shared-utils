const escapeCompactLogValue = (value) => {
    return value.replace(/'/g, "\\'");
};
export const formatCompactLogList = (values) => {
    return `[ ${values.map((value) => `'${escapeCompactLogValue(value)}'`).join(", ")} ]`;
};
export const formatCompactLogText = (value, fallback = "n/a") => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return fallback;
    }
    return `'${escapeCompactLogValue(trimmed)}'`;
};
export const formatCompactLogValue = (value, fallback = "n/a") => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return fallback;
    }
    return trimmed;
};
export const formatCompactLogLine = (values) => {
    return values
        .filter(([, value]) => {
        return Boolean(value && value.trim());
    })
        .map(([key, value]) => {
        return `${key}: ${value}`;
    })
        .join(", ");
};
export const formatHierarchicalLog = (parentLine, childLines = []) => {
    const lines = [parentLine];
    for (const childLine of childLines) {
        const normalizedLine = childLine?.trim();
        if (!normalizedLine) {
            continue;
        }
        lines.push(`  + ${normalizedLine}`);
    }
    return lines.join("\n");
};
//# sourceMappingURL=logFormat.js.map