"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCmsEtag = exports.assertIfMatchSatisfied = exports.parseIfMatchHeader = void 0;
const errors_js_1 = require("./errors.js");
const parseIfMatchHeader = (header) => {
    const raw = String(header || "").trim();
    if (!raw) {
        return [];
    }
    if (raw === "*") {
        return ["*"];
    }
    return raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
};
exports.parseIfMatchHeader = parseIfMatchHeader;
const assertIfMatchSatisfied = (input) => {
    const tags = (0, exports.parseIfMatchHeader)(input.ifMatchHeader);
    if (tags.length === 0) {
        throw new errors_js_1.CmsValidationError("If-Match header is required for CMS writes", {
            "If-Match": "Missing required header",
        });
    }
    if (tags.includes("*")) {
        return;
    }
    const current = String(input.currentEtag || "").trim();
    if (!current) {
        return;
    }
    const matched = tags.some((t) => t === current);
    if (!matched) {
        throw new errors_js_1.CmsPreconditionFailedError(`ETag mismatch: expected "${current}", got "${tags.join(", ")}"`);
    }
};
exports.assertIfMatchSatisfied = assertIfMatchSatisfied;
const computeCmsEtag = (uid, version) => {
    return `cms:${uid}:v${version}`;
};
exports.computeCmsEtag = computeCmsEtag;
//# sourceMappingURL=concurrency.js.map