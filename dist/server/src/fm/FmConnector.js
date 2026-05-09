/** Type guard: check if a connector supports transactions. */
export function hasTransaction(connector) {
    return (typeof connector.withTransaction ===
        "function");
}
/** Type guard: check if a connector supports batch variant deletes. */
export function hasBatchVariantDelete(connector) {
    return (typeof connector
        .deleteVariantsByUids === "function");
}
/** Type guard: check if a connector supports batch variant listing. */
export function hasBatchVariantList(connector) {
    return (typeof connector
        .listVariantsForFiles === "function");
}
/** Type guard: check if a connector supports entity-centric link queries. */
export function hasEntityLinks(connector) {
    return (typeof connector.listLinksForEntity ===
        "function" &&
        typeof connector.deleteLinksForEntity ===
            "function");
}
/** Type guard: check if a connector supports file-centric link deletion. */
export function hasFileLinkDelete(connector) {
    return (typeof connector.deleteLinksForFile ===
        "function");
}
//# sourceMappingURL=FmConnector.js.map