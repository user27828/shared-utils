"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdownToSanitizedHtml = exports.sanitizeCmsHtml = void 0;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const ALLOWED_TAGS = [
    "a",
    "p",
    "div",
    "span",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "strong",
    "em",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "figure",
    "figcaption",
    "video",
    "source",
];
const ALLOWED_ATTRIBUTES = {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    video: ["src", "poster", "width", "height", "controls", "preload"],
    source: ["src", "type"],
    "*": ["class", "data-fm-uid", "data-fm-variant"],
};
const ALLOWED_SCHEMES = ["http", "https", "mailto"];
const isAllowedUrl = (url) => {
    const trimmed = String(url || "").trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
        return true;
    }
    try {
        const parsed = new URL(trimmed);
        return ALLOWED_SCHEMES.includes(parsed.protocol.replace(":", ""));
    }
    catch {
        return !trimmed.includes(":");
    }
};
const sanitizeCmsHtml = (html) => {
    return (0, sanitize_html_1.default)(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedSchemes: ALLOWED_SCHEMES,
        transformTags: {
            a: (tagName, attribs) => {
                const href = String(attribs.href || "").trim();
                if (href && !isAllowedUrl(href)) {
                    return { tagName, attribs: { ...attribs, href: "" } };
                }
                if (attribs.target === "_blank") {
                    attribs.rel = "noopener noreferrer";
                }
                return { tagName, attribs };
            },
            img: (tagName, attribs) => {
                const src = String(attribs.src || "").trim();
                if (src && !isAllowedUrl(src)) {
                    return { tagName, attribs: { ...attribs, src: "" } };
                }
                return { tagName, attribs };
            },
        },
    });
};
exports.sanitizeCmsHtml = sanitizeCmsHtml;
let markedInstance = null;
const getMarked = async () => {
    if (!markedInstance) {
        markedInstance = await Promise.resolve().then(() => __importStar(require("marked")));
    }
    return markedInstance;
};
const renderMarkdownToSanitizedHtml = async (markdown) => {
    const { marked } = await getMarked();
    const raw = await marked(markdown);
    return (0, exports.sanitizeCmsHtml)(raw);
};
exports.renderMarkdownToSanitizedHtml = renderMarkdownToSanitizedHtml;
//# sourceMappingURL=sanitization.js.map