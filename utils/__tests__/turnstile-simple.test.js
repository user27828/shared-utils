/**
 * Simple Turnstile tests
 * @jest-environment node
 */

describe('Turnstile Utility - Basic Tests', () => {
  it('should be importable from the utils package', async () => {
    // Import the built files directly
    const module = await import('@shared-utils/utils');
    const { turnstile, Turnstile } = module;
    
    expect(turnstile).toBeDefined();
    expect(Turnstile).toBeDefined();
    expect(typeof turnstile.setOptions).toBe('function');
    expect(typeof turnstile.getOptions).toBe('function');
  });

  it('should have correct default options', async () => {
    const { turnstile } = await import('@shared-utils/utils');
    const options = turnstile.getOptions();
    expect(options.environment).toBe('server'); // Should detect server in Node.js
    expect(options.apiUrl).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(options.scriptUrl).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js');
  });

  it('should allow setting options', async () => {
    const { turnstile } = await import('@shared-utils/utils');
    
    turnstile.setOptions({
      siteKey: 'test-site-key',
      secretKey: 'test-secret-key',
    });

    const options = turnstile.getOptions();
    expect(options.siteKey).toBe('test-site-key');
    expect(options.secretKey).toBe('test-secret-key');
  });

  it('should create new instances of Turnstile class', async () => {
    const { Turnstile } = await import('@shared-utils/utils');
    
    const instance1 = new Turnstile();
    const instance2 = new Turnstile();
    
    expect(instance1).toBeInstanceOf(Turnstile);
    expect(instance2).toBeInstanceOf(Turnstile);
    expect(instance1).not.toBe(instance2);
  });

  it('should have all expected methods', async () => {
    const { turnstile } = await import('@shared-utils/utils');
    
    const expectedMethods = [
      'setOptions',
      'getOptions', 
      'render',
      'verify',
      'getResponse',
      'reset',
      'remove',
      'isExpired',
      'cleanup'
    ];

    expectedMethods.forEach(method => {
      expect(typeof turnstile[method]).toBe('function');
    });
  });
});
