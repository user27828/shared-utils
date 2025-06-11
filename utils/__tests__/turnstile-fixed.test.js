/**
 * Turnstile utility tests - Fixed version
 * @jest-environment node
 */

import { turnstile, Turnstile } from '@shared-utils/utils';

describe('Turnstile Utility', () => {
  beforeEach(() => {
    // Reset turnstile options before each test
    turnstile.resetOptions();
  });

  describe('Basic Functionality', () => {
    it('should be properly exported', () => {
      expect(turnstile).toBeDefined();
      expect(Turnstile).toBeDefined();
      expect(typeof turnstile.setOptions).toBe('function');
      expect(typeof turnstile.getOptions).toBe('function');
    });

    it('should detect server environment in Node.js', () => {
      const options = turnstile.getOptions();
      expect(options.environment).toBe('server');
    });

    it('should have correct default configuration', () => {
      const options = turnstile.getOptions();
      expect(options.apiUrl).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
      expect(options.scriptUrl).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js');
      expect(options.widget.theme).toBe('auto');
      expect(options.widget.size).toBe('normal');
    });

    it('should allow setting options', () => {
      turnstile.setOptions({
        siteKey: 'test-site-key',
        secretKey: 'test-secret-key',
        widget: {
          theme: 'dark',
          size: 'compact',
        },
      });

      const options = turnstile.getOptions();
      expect(options.siteKey).toBe('test-site-key');
      expect(options.secretKey).toBe('test-secret-key');
      expect(options.widget.theme).toBe('dark');
      expect(options.widget.size).toBe('compact');
    });

    it('should merge widget options correctly', () => {
      // Set initial options
      turnstile.setOptions({
        widget: { theme: 'light' }
      });

      // Update with additional options
      turnstile.setOptions({
        widget: { size: 'compact' }
      });

      const options = turnstile.getOptions();
      expect(options.widget.theme).toBe('light'); // Should retain previous value
      expect(options.widget.size).toBe('compact'); // Should have new value
    });
  });

  describe('Class Instantiation', () => {
    it('should allow creating new instances', () => {
      const instance1 = new Turnstile();
      const instance2 = new Turnstile();
      
      expect(instance1).toBeInstanceOf(Turnstile);
      expect(instance2).toBeInstanceOf(Turnstile);
      expect(instance1).not.toBe(instance2);
      expect(instance1).not.toBe(turnstile);
    });

    it('should have independent options for different instances', () => {
      const instance1 = new Turnstile();
      const instance2 = new Turnstile();
      
      instance1.setOptions({ siteKey: 'key1' });
      instance2.setOptions({ siteKey: 'key2' });
      
      expect(instance1.getOptions().siteKey).toBe('key1');
      expect(instance2.getOptions().siteKey).toBe('key2');
    });
  });

  describe('Method Availability', () => {
    it('should have all expected methods', () => {
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

  describe('Server-side Methods', () => {
    beforeEach(() => {
      // Mock fetch for verification tests
      global.fetch = jest.fn();
      
      // Mock FormData
      global.FormData = class MockFormData {
        constructor() {
          this.data = {};
        }
        append(key, value) {
          this.data[key] = value;
        }
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should require secret key for verification', async () => {
      await expect(turnstile.verify('test-token')).rejects.toThrow(
        'Secret key is required'
      );
    });

    it('should call Cloudflare API for verification', async () => {
      turnstile.setOptions({ secretKey: 'test-secret' });
      
      const mockResponse = {
        success: true,
        challenge_ts: '2024-01-01T00:00:00.000Z',
        hostname: 'example.com',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await turnstile.verify('test-token', '192.168.1.1');
      
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(URLSearchParams),
        })
      );
    });

    it('should include all parameters in verification request', async () => {
      turnstile.setOptions({ secretKey: 'test-secret' });
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await turnstile.verify('test-token', '192.168.1.1');
      
      const formData = global.fetch.mock.calls[0][1].body;
      const formParams = new URLSearchParams(formData);
      expect(Object.fromEntries(formParams)).toEqual({
        secret: 'test-secret',
        response: 'test-token',
        remoteip: '192.168.1.1',
      });
    });

    it('should handle verification failures', async () => {
      turnstile.setOptions({ secretKey: 'test-secret' });
      
      const mockResponse = {
        success: false,
        'error-codes': ['invalid-input-response'],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await turnstile.verify('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('invalid-input-response');
    });

    it('should handle network errors', async () => {
      turnstile.setOptions({ secretKey: 'test-secret' });
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(turnstile.verify('test-token')).rejects.toThrow('Network error');
    });
  });

  describe('Client-side Methods', () => {
    it('should throw errors for client-only methods in server environment', () => {
      expect(() => turnstile.getResponse()).toThrow(
        'Getting response is only available on client-side'
      );
      
      expect(() => turnstile.reset()).toThrow(
        'Widget reset is only available on client-side'
      );
      
      expect(() => turnstile.remove('widget-id')).toThrow(
        'Widget removal is only available on client-side'
      );
      
      expect(() => turnstile.isExpired()).toThrow(
        'Widget expiry check is only available on client-side'
      );
    });

    it('should require site key for rendering', async () => {
      // Set to client environment to test site key validation
      turnstile.setOptions({ environment: 'client' });
      
      await expect(turnstile.render('#container')).rejects.toThrow(
        'Site key is required'
      );
    });
  });

  describe('Interceptor Support', () => {
    it('should allow setting an interceptor', () => {
      const interceptor = jest.fn();
      turnstile.setOptions({ interceptor });
      
      const options = turnstile.getOptions();
      expect(options.interceptor).toBe(interceptor);
    });

    it('should call interceptor during verification', async () => {
      const interceptor = jest.fn();
      turnstile.setOptions({
        secretKey: 'test-secret',
        interceptor,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await turnstile.verify('test-token');
      
      expect(interceptor).toHaveBeenCalledWith('verify-start', expect.any(Object));
      expect(interceptor).toHaveBeenCalledWith('verify-complete', expect.any(Object));
    });

    it('should handle interceptor errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const faultyInterceptor = jest.fn(() => {
        throw new Error('Interceptor error');
      });
      
      turnstile.setOptions({
        secretKey: 'test-secret',
        interceptor: faultyInterceptor,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Should not throw despite interceptor error
      await expect(turnstile.verify('test-token')).resolves.toEqual({ success: true });
      expect(faultyInterceptor).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Turnstile interceptor error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
