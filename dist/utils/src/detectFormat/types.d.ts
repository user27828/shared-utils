export interface FormatCheck {
    quickCheck: (text: string) => boolean;
    comprehensiveCheck?: (text: string) => boolean;
    quickConfidence: number;
    compConfidence: number;
    mimeType: string;
    extension: string;
    reasons: string[];
}
//# sourceMappingURL=types.d.ts.map