import Prism from "prismjs/components/prism-core.js";

type PrismHolder = typeof globalThis & {
  Prism?: typeof Prism;
};

const setPrismGlobal = () => {
  const globalScope = globalThis as PrismHolder;
  const windowScope =
    typeof window !== "undefined"
      ? (window as Window & { Prism?: typeof Prism })
      : undefined;

  if (typeof globalThis !== "undefined") {
    globalScope.Prism = globalScope.Prism || Prism;
  }

  if (windowScope) {
    windowScope.Prism = windowScope.Prism || Prism;
  }

  const prism: typeof Prism = globalScope.Prism ?? windowScope?.Prism ?? Prism;
  prism.manual = true;

  return prism;
};

const prism = setPrismGlobal();

export const prismReady = Promise.resolve(prism);

export const ensurePrismGlobal = async () => {
  return await prismReady;
};

export default prism;
