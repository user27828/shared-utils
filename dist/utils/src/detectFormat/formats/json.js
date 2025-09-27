export const jsonCheck = {
    quickCheck: (text) => {
        const trimmed = text.trim();
        // Check for JSON array, object, string, number, boolean, or null
        return (/^\s*[\[\{]/.test(trimmed) || // array or object
            /^\s*"/.test(trimmed) || // string
            /^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/.test(trimmed) || // number
            /^\s*(true|false|null)\s*$/.test(trimmed) // boolean or null
        );
    },
    comprehensiveCheck: (text) => {
        try {
            JSON.parse(text);
            return true;
        }
        catch {
            return false;
        }
    },
    quickConfidence: 0.5,
    compConfidence: 1.0,
    mimeType: "application/json",
    extension: "json",
    reasons: [
        "Content starts with JSON array or object bracket",
        "Full content parses as valid JSON",
    ],
};
