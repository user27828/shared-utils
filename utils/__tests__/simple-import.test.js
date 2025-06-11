/**
 * Test to verify package imports work in Jest
 * @jest-environment node
 */

describe('Package Import Test', () => {
  it('should import OptionsManager from package', async () => {
    const { OptionsManager, optionsManager } = await import('@shared-utils/utils');
    
    expect(OptionsManager).toBeDefined();
    expect(typeof OptionsManager).toBe('function');
    expect(optionsManager).toBeDefined();
    expect(typeof optionsManager.getRegisteredUtilities).toBe('function');
    
    // Test basic functionality
    const manager = new OptionsManager('test', { defaultValue: 42 });
    expect(manager.getOptions()).toEqual({ defaultValue: 42 });
    
    console.log('✅ Import test passed!');
  });
});
