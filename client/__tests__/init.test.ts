import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const managerSymbol = Symbol.for("@shared-utils/options-manager");
const globals = globalThis as any;

describe("client init entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    delete globals[managerSymbol];
    delete globals.__shared_utils_optionsManager;
    delete globals.__MUI_X_TELEMETRY_DISABLED__;
    delete globals.log;
    delete (window as any).log;
  });

  afterEach(() => {
    vi.resetModules();
    delete globals[managerSymbol];
    delete globals.__shared_utils_optionsManager;
    delete globals.__MUI_X_TELEMETRY_DISABLED__;
    delete globals.log;
    delete (window as any).log;
  });

  it("initializes the logger synchronously after the canonical manager", async () => {
    await import("../src/init.js");

    const optionsManager = globals[managerSymbol];

    expect((window as any).log).toBeDefined();
    expect(optionsManager).toBeDefined();
    expect(optionsManager.getRegisteredUtilities()).toContain("log");
    expect(globals.__MUI_X_TELEMETRY_DISABLED__).toBe(true);
  });

  it("preserves an existing host logger", async () => {
    const hostLogger = { info: vi.fn() };
    globals.log = hostLogger;
    (window as any).log = hostLogger;

    await import("../src/init.js");

    expect(globals.log).toBe(hostLogger);
    expect((window as any).log).toBe(hostLogger);
  });
});
