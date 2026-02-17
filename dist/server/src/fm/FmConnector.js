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
/** Type guard: check if a connector supports entity-centric link queries. */
export function hasEntityLinks(connector) {
    return (typeof connector.listLinksForEntity ===
        "function" &&
        typeof connector.deleteLinksForEntity ===
            "function");
}
//# sourceMappingURL=FmConnector.js.map