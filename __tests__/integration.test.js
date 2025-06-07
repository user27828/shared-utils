/**
 * Integration tests for the complete shared-utils package functionality
 * @jest-environment node
 */

describe('Shared Utils Integration Tests', () => {
  let originalConsole;
  let originalNodeEnv;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });
  
  beforeEach(() => {
    originalConsole = { ...console };
    jest.resetModules(); // Reset module cache to get a fresh logger instance
    // Tests should set their own NODE_ENV as needed. It will be reset in afterEach.
  });

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole);
    jest.restoreAllMocks(); // Ensure all mocks are restored
    process.env.NODE_ENV = originalNodeEnv; // Restore NODE_ENV
  });

  describe('End-to-End Usage Scenarios', () => {
    it('should work in a typical server-side Node.js application', () => {
      // Simulate server environment
      process.env.NODE_ENV = 'production';
      
      const { log, Log } = require('../utils');
      
      // Configure for server use
      log.setOptions({
        type: 'server',
        server: {
          namespace: 'my-server',
          production: ['warn', 'error']
        }
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // In production, only warn/error should log
      log.log('debug info'); // Should not log
      log.warn('important warning'); // Should log
      
      expect(logSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('important warning');
    });

    it('should work with custom interceptors for analytics', () => {
      process.env.NODE_ENV = 'development';
      
      const { log } = require('../utils');
      const analyticsData = [];
      
      // Configure with analytics interceptor
      log.setOptions({
        type: 'server',
        interceptor: (level, args) => {
          analyticsData.push({ level, args });
        }
      });
      
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      log.info('user action', { userId: 123, action: 'login' });
      
      expect(analyticsData).toHaveLength(1);
      expect(analyticsData[0]).toEqual({
        level: 'info',
        args: ['user action', { userId: 123, action: 'login' }]
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('user action', { userId: 123, action: 'login' });
    });

    it('should handle destructured imports correctly', () => {
      process.env.NODE_ENV = 'development';
      
      const { log } = require('../utils');
      const { info, warn, error } = log;
      
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      info('info message');
      warn('warn message');
      error('error message');
      
      expect(infoSpy).toHaveBeenCalledWith('info message');
      expect(warnSpy).toHaveBeenCalledWith('warn message');
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });

    it('should maintain singleton behavior across multiple imports', () => {
      const utils1 = require('../utils');
      const utils2 = require('../utils');
      
      // Same instance
      expect(utils1.log).toBe(utils2.log);
      
      // Configuration should persist
      utils1.log.setOptions({ type: 'client' });
      expect(utils2.log.getOptions().type).toBe('client');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid interceptor gracefully', () => {
      const { log } = require('../utils');
      
      const consoleErrorSpy = jest.spyOn(log.ORIGINAL_CONSOLE_METHODS, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(); 
      
      // Set up faulty interceptor
      log.setOptions({
        interceptor: () => {
          throw new Error('Interceptor failure');
        }
      });
      
      process.env.NODE_ENV = 'development';
      
      // Should still log despite interceptor error
      log.log('test message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Log interceptor error:',
        expect.any(Error)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should handle missing localStorage gracefully', () => {
      // Mock client environment without localStorage
      global.window = { location: { hostname: 'example.com' } };
      global.document = {};
      delete global.localStorage;
      
      const { Log } = require('../utils'); 
      const clientLog = new Log();
      const consoleWarnSpy = jest.spyOn(clientLog.ORIGINAL_CONSOLE_METHODS, 'warn').mockImplementation();
      
      expect(() => {
        clientLog.enableDebug();
        clientLog.disableDebug();
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      // Corrected expected warning messages
      expect(consoleWarnSpy).toHaveBeenCalledWith('localStorage not available, cannot enable debug mode.');
      expect(consoleWarnSpy).toHaveBeenCalledWith('localStorage not available, cannot disable debug mode.');
      
      // Cleanup
      delete global.window;
      delete global.document;
    });

    it('should handle malformed localStorage data', () => {
      global.window = { location: { hostname: 'example.com' } };
      global.document = {};
      global.localStorage = {
        getItem: jest.fn().mockReturnValue('invalid json{'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };
      
      const { Log } = require('../utils');
      const clientLog = new Log();
      
      // Should handle invalid JSON gracefully
      expect(clientLog.getLocalStorageOverride()).toBeNull();
      
      // Cleanup
      delete global.window;
      delete global.document;
      delete global.localStorage;
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with many log calls', () => {
      const { log } = require('../utils');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.NODE_ENV = 'development';
      
      // Should handle many calls without issues
      for (let i = 0; i < 1000; i++) {
        log.log(`message ${i}`);
      }
      
      expect(consoleSpy).toHaveBeenCalledTimes(1000);
    });

    it('should reuse the same log instance', () => {
      const imports = [];
      
      // Import multiple times
      for (let i = 0; i < 10; i++) {
        imports.push(require('../utils').log);
      }
      
      // All should be the same instance
      const firstInstance = imports[0];
      expect(imports.every(instance => instance === firstInstance)).toBe(true);
    });
  });
});
