const DATA_URI_PREFIX = "data:";
const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const inferExtensionFromMimeType = (mimeType) => {
    const normalized = mimeType.toLowerCase();
    if (normalized === "image/jpeg") {
        return "jpg";
    }
    if (normalized === "image/svg+xml") {
        return "svg";
    }
    const slashIndex = normalized.indexOf("/");
    if (slashIndex < 0 || slashIndex === normalized.length - 1) {
        return "png";
    }
    return (normalized.slice(slashIndex + 1).replace(/[^a-z0-9.+-]/gi, "") || "png");
};
const looksLikeEmbeddedImageDataUri = (value) => {
    if (!value) {
        return false;
    }
    const trimmed = value.trim().toLowerCase();
    return trimmed.startsWith("data:image/");
};
const estimateBase64Bytes = (base64Payload) => {
    const sanitized = base64Payload.replace(/\s+/g, "");
    if (!sanitized) {
        return 0;
    }
    const paddingLength = sanitized.endsWith("==")
        ? 2
        : sanitized.endsWith("=")
            ? 1
            : 0;
    return Math.max(0, Math.floor((sanitized.length * 3) / 4) - paddingLength);
};
const decodeBase64Payload = (base64Payload) => {
    const sanitized = base64Payload.replace(/\s+/g, "");
    return atob(sanitized);
};
const decodeUriPayload = (payload) => {
    return decodeURIComponent(payload);
};
const dataUriToFile = (dataUri, index, maxImageBytes) => {
    if (!dataUri.toLowerCase().startsWith(DATA_URI_PREFIX)) {
        return null;
    }
    const commaIndex = dataUri.indexOf(",");
    if (commaIndex < 0) {
        return null;
    }
    const header = dataUri.slice(DATA_URI_PREFIX.length, commaIndex);
    const payload = dataUri.slice(commaIndex + 1);
    if (!header || !payload) {
        return null;
    }
    const headerParts = header
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);
    const mimeType = (headerParts[0] || "image/png").toLowerCase();
    if (!mimeType.startsWith("image/")) {
        return null;
    }
    const isBase64 = headerParts.includes("base64");
    let byteArray;
    if (isBase64) {
        const estimatedBytes = estimateBase64Bytes(payload);
        if (estimatedBytes > maxImageBytes) {
            return null;
        }
        // atob() returns a latin-1 string where each char is one byte.
        // We must convert to Uint8Array; passing the string directly to
        // new File([string]) would re-encode as UTF-8, corrupting any
        // byte > 0x7F (i.e., virtually every real image).
        const binaryString = decodeBase64Payload(payload);
        byteArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
        }
    }
    else {
        // URI-encoded data URIs encode raw bytes as percent-escapes.
        // TextEncoder converts the decoded string to proper UTF-8 bytes.
        const decoded = decodeUriPayload(payload);
        byteArray = new TextEncoder().encode(decoded);
    }
    if (byteArray.length > maxImageBytes) {
        return null;
    }
    const ext = inferExtensionFromMimeType(mimeType);
    const filename = `pasted-image-${index + 1}.${ext}`;
    return new File([byteArray], filename, { type: mimeType });
};
export const hasEmbeddedBase64Image = (html) => {
    if (!html) {
        return false;
    }
    return /<img\b[^>]*\bsrc\s*=\s*["']\s*data:image\//i.test(html);
};
export const normalizeEmbeddedHtmlImages = async (options) => {
    const { html, uploadImage } = options;
    const maxImageBytes = options.maxImageBytes || DEFAULT_MAX_IMAGE_BYTES;
    if (!hasEmbeddedBase64Image(html)) {
        return html;
    }
    if (typeof document === "undefined") {
        return html;
    }
    const template = document.createElement("template");
    template.innerHTML = html;
    const imageNodes = Array.from(template.content.querySelectorAll("img[src]"));
    if (imageNodes.length === 0) {
        return html;
    }
    const uploadedUrlByDataUri = new Map();
    let hasChanges = false;
    for (let i = 0; i < imageNodes.length; i += 1) {
        const img = imageNodes[i];
        const src = img.getAttribute("src");
        if (!looksLikeEmbeddedImageDataUri(src)) {
            continue;
        }
        const dataUri = src.trim();
        let uploadedUrl = uploadedUrlByDataUri.get(dataUri);
        if (!uploadedUrl) {
            const file = dataUriToFile(dataUri, i, maxImageBytes);
            if (!file) {
                continue;
            }
            const result = await uploadImage(file, { source: "pasted-data-uri" });
            if (!result) {
                continue;
            }
            uploadedUrl = String(result).trim();
            if (!uploadedUrl) {
                continue;
            }
            uploadedUrlByDataUri.set(dataUri, uploadedUrl);
        }
        if (img.getAttribute("src") !== uploadedUrl) {
            img.setAttribute("src", uploadedUrl);
            hasChanges = true;
        }
    }
    if (!hasChanges) {
        return html;
    }
    return template.innerHTML;
};
