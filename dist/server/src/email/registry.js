const toSummary = (descriptor) => ({
    uid: descriptor.uid,
    name: descriptor.name,
    category: descriptor.category,
    description: descriptor.description,
    sendScenarios: descriptor.sendScenarios,
    tags: descriptor.tags,
    fixtureCount: descriptor.previewFixtures.length,
});
export const createEmailTemplateRegistry = (descriptors) => {
    const byUid = new Map();
    for (const descriptor of descriptors) {
        if (byUid.has(descriptor.uid)) {
            throw new Error(`Duplicate email template uid: ${descriptor.uid}`);
        }
        byUid.set(descriptor.uid, descriptor);
    }
    return {
        list() {
            return Array.from(byUid.values()).map((descriptor) => toSummary(descriptor));
        },
        get(uid) {
            const descriptor = byUid.get(uid);
            if (!descriptor) {
                throw new Error(`Unknown email template: ${uid}`);
            }
            return descriptor;
        },
        has(uid) {
            return byUid.has(uid);
        },
        getDetail(uid) {
            const descriptor = this.get(uid);
            return {
                ...toSummary(descriptor),
                previewFixtures: descriptor.previewFixtures.map((fixture) => ({
                    uid: fixture.uid,
                    label: fixture.label,
                    description: fixture.description,
                })),
            };
        },
    };
};
//# sourceMappingURL=registry.js.map