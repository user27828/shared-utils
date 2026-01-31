export const normalizeCssSize = (value) => {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === "number") {
        return `${value}px`;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed;
};
export const pickLocalFile = async (options) => {
    const { accept } = options;
    return await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        if (accept) {
            input.accept = accept;
        }
        const cleanup = () => {
            input.value = "";
            input.remove();
        };
        input.addEventListener("change", () => {
            const file = input.files && input.files.length > 0 ? input.files[0] : null;
            cleanup();
            resolve(file);
        }, { once: true });
        input.addEventListener("cancel", () => {
            cleanup();
            resolve(null);
        }, { once: true });
        document.body.appendChild(input);
        input.click();
    });
};
