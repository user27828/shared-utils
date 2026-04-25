const escapeCompactLogValue = (value: string): string => {
  return value.replace(/'/g, "\\'");
};

export const formatCompactLogList = (values: string[]): string => {
  return `[ ${values.map((value) => `'${escapeCompactLogValue(value)}'`).join(", ")} ]`;
};

export const formatCompactLogText = (
  value: string | null | undefined,
  fallback = "n/a",
): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  return `'${escapeCompactLogValue(trimmed)}'`;
};

export const formatCompactLogValue = (
  value: string | null | undefined,
  fallback = "n/a",
): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed;
};

export const formatCompactLogLine = (
  values: Array<[key: string, value: string | null | undefined]>,
): string => {
  return values
    .filter(([, value]) => {
      return Boolean(value && value.trim());
    })
    .map(([key, value]) => {
      return `${key}: ${value}`;
    })
    .join(", ");
};

export const formatHierarchicalLog = (
  parentLine: string,
  childLines: Array<string | null | undefined> = [],
): string => {
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
