/** Type guard to check if a connector supports public head */
export const hasPublicHead = (connector) => {
    return typeof connector.getPublicHeadBySlug === "function";
};
//# sourceMappingURL=connector.js.map