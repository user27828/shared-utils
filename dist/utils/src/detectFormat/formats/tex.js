export const texCheck = {
    quickCheck: (text) => text.includes("\\documentclass") ||
        /\\([a-zA-Z]+){/.test(text) ||
        /\\begin\{/.test(text),
    comprehensiveCheck: (text) => {
        const commands = (text.match(/\\([a-zA-Z]+)/g) || []).length;
        const environments = (text.match(/\\begin\{[^}]+\}/g) || []).length +
            (text.match(/\\end\{[^}]+\}/g) || []).length;
        // For minimal documents: require \documentclass and document environment
        const hasDocumentclass = /\\documentclass/.test(text);
        const hasDocumentEnv = /\\begin\{document\}/.test(text) && /\\end\{document\}/.test(text);
        if (hasDocumentclass && hasDocumentEnv) {
            return true; // Minimal LaTeX document
        }
        // For other LaTeX content: require multiple commands and environments
        return commands > 3 && environments > 0;
    },
    quickConfidence: 0.7,
    compConfidence: 0.95,
    mimeType: "text/x-tex",
    extension: "tex",
    reasons: [
        "LaTeX command or environment detected",
        "Multiple LaTeX commands and environments found",
    ],
};
