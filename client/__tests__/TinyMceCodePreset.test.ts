import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const globals = globalThis as any;

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((media: string) => ({
    matches: false,
    media,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("TinyMCE code preset", () => {
  beforeEach(() => {
    vi.resetModules();
    delete globals.Prism;
    delete globals.tinymce;
    delete (window as any).Prism;
    delete (window as any).tinymce;
  });

  afterEach(() => {
    vi.resetModules();
    delete globals.Prism;
    delete globals.tinymce;
    delete (window as any).Prism;
    delete (window as any).tinymce;
  });

  it("loads Prism before registering the selected TinyMCE plugins", async () => {
    await import("../src/components/wysiwyg/tinymce/minimal.js");

    const tinyMce = globals.tinymce ?? (window as any).tinymce;
    const pluginManager = tinyMce.PluginManager;
    const originalAdd = pluginManager.add.bind(pluginManager);
    const registeredPlugins: string[] = [];
    const codePlugins = new Set([
      "code",
      "codesample",
      "visualblocks",
      "visualchars",
    ]);

    pluginManager.add = (name: string, plugin: unknown) => {
      if (codePlugins.has(name)) {
        expect(globals.Prism).toBeDefined();
        registeredPlugins.push(name);
      }

      return originalAdd(name, plugin);
    };

    try {
      await import("../src/components/wysiwyg/tinymce/features/code.js");
    } finally {
      pluginManager.add = originalAdd;
    }

    expect(globals.Prism.manual).toBe(true);
    expect(registeredPlugins).toEqual(expect.arrayContaining([...codePlugins]));
    expect(pluginManager.get("code")).toBeTypeOf("function");
    expect(pluginManager.get("codesample")).toBeTypeOf("function");
    expect(pluginManager.get("visualblocks")).toBeTypeOf("function");
    expect(pluginManager.get("visualchars")).toBeTypeOf("function");
  });
});
