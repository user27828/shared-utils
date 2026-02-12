"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPublicHead = void 0;
const hasPublicHead = (connector) => {
    return typeof connector.getPublicHeadBySlug === "function";
};
exports.hasPublicHead = hasPublicHead;
//# sourceMappingURL=connector.js.map