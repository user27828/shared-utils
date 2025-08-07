/**
 * Test to verify imports work
 * @jest-environment node
 */

describe('Import Test', () => {
  it('should import from ES modules', async () => {
    const module = await import('@shared-utils/utils');
    expect(module.log).toBeDefined();
    expect(module.turnstile).toBeDefined();
    expect(module.OptionsManager).toBeDefined();
    expect(module.optionsManager).toBeDefined();
  }, 20000); // Increase timeout to 20s for ESM import
});
