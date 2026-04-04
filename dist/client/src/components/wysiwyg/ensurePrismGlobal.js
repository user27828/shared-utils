import Prism from "prismjs/components/prism-core.js";
const setPrismGlobal = () => {
    const globalScope = globalThis;
    const windowScope = typeof window !== "undefined"
        ? window
        : undefined;
    if (typeof globalThis !== "undefined") {
        globalScope.Prism = globalScope.Prism || Prism;
    }
    if (windowScope) {
        windowScope.Prism = windowScope.Prism || Prism;
    }
    const prism = globalScope.Prism ?? windowScope?.Prism ?? Prism;
    prism.manual = true;
    return prism;
};
const prism = setPrismGlobal();
export const prismReady = Promise.resolve(prism);
export const ensurePrismGlobal = async () => {
    return await prismReady;
};
export default prism;
