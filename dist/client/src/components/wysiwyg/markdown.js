const escapeMarkdownLabel = (value) => {
    // Keep this intentionally conservative: escape bracket-like characters that can break syntax.
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/\r?\n/g, " ")
        .trim();
};
const escapeMarkdownUrl = (url) => {
    // We keep URLs as-is but trim whitespace. Consumers should ensure canonicalization.
    return String(url || "").trim();
};
export const formatMarkdownLink = (params) => {
    const url = escapeMarkdownUrl(params.url);
    const label = escapeMarkdownLabel(params.label || url);
    return `[${label}](${url})`;
};
export const formatMarkdownImage = (params) => {
    const url = escapeMarkdownUrl(params.url);
    const alt = escapeMarkdownLabel(params.alt || "");
    return `![${alt}](${url})`;
};
