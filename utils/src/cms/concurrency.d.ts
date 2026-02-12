export declare const parseIfMatchHeader: (header: string | null | undefined) => string[];
export declare const assertIfMatchSatisfied: (input: {
    ifMatchHeader: string | null | undefined;
    currentEtag: string | null | undefined;
}) => void;
export declare const computeCmsEtag: (uid: string, version: number) => string;
//# sourceMappingURL=concurrency.d.ts.map