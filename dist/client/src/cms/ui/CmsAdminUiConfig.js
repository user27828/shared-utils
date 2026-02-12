// ─── Default toast (console) ──────────────────────────────────────────────
export const defaultToast = {
    success: (msg) => {
        if (typeof console !== "undefined") {
            console.log("[CMS]", msg);
        }
    },
    error: (msg) => {
        if (typeof console !== "undefined") {
            console.error("[CMS]", msg);
        }
    },
    info: (msg) => {
        if (typeof console !== "undefined") {
            console.info("[CMS]", msg);
        }
    },
};
