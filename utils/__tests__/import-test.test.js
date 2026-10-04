/**
 * Test to verify imports work
 * @jest-environment node
 */

describe("Import Test", () => {
  it("should import pure helpers and explicit utility subpaths", async () => {
    const root = await import("@shared-utils/utils");
    const [log, turnstile, options] = await Promise.all([
      import("@shared-utils/utils/log"),
      import("@shared-utils/utils/turnstile"),
      import("@shared-utils/utils/options"),
    ]);

    expect(root.isValidEmail).toBeDefined();
    expect(root.log).toBeUndefined();
    expect(log.log).toBeDefined();
    expect(turnstile.turnstile).toBeDefined();
    expect(options.OptionsManager).toBeDefined();
    expect(options.optionsManager).toBeDefined();
  }, 20000); // Increase timeout to 20s for ESM import
});
