/**
 * Tests for the Log utility class and logging functionality
 * @jest-environment node
 */

import { Log } from '../dist/src/log.js';

describe('Log Utility', () => {
  let logInstance;

  beforeEach(() => {
    logInstance = new Log();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset NODE_ENV after each test
    if (process.env.ORIGINAL_NODE_ENV) {
      process.env.NODE_ENV = process.env.ORIGINAL_NODE_ENV;
      delete process.env.ORIGINAL_NODE_ENV;
    }
  });

  describe('Environment Detection', () => {
    it('should detect server environment by default in Node.js', () => {
      expect(logInstance.detectEnvironment()).toBe('server');
    });

    it('should detect client environment when window and document exist', () => {
      // Mock browser environment
      global.window = { location: { hostname: 'localhost' } };
      global.document = {};
      
      const clientLog = new Log();
      expect(clientLog.detectEnvironment()).toBe('client');
      
      // Cleanup
      delete global.window;
      delete global.document;
    });
  });

  describe('Production Mode Detection', () => {
    it('should detect production mode from NODE_ENV', () => {
      process.env.ORIGINAL_NODE_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const prodLog = new Log();
      expect(prodLog.isProduction).toBe(true);
    });

    it('should detect development mode when NODE_ENV is not production', () => {
      process.env.ORIGINAL_NODE_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const devLog = new Log();
      expect(devLog.isProduction).toBe(false);
    });
  });

  describe('Basic Logging', () => {
    it('should log messages at different levels', () => {
      logInstance.log('log message');
      logInstance.info('info message');  
      logInstance.warn('warn message');
      logInstance.error('error message');
      logInstance.debug('debug message');

      expect(console.log).toHaveBeenCalledWith('log message');
      expect(console.info).toHaveBeenCalledWith('info message');
      expect(console.warn).toHaveBeenCalledWith('warn message');
      expect(console.error).toHaveBeenCalledWith('error message');
      expect(console.debug).toHaveBeenCalledWith('debug message');
    });

    it('should handle multiple arguments', () => {
      logInstance.log('message', 'arg1', 'arg2');
      logInstance.info('info', { key: 'value' });
      
      expect(console.log).toHaveBeenCalledWith('message', 'arg1', 'arg2');
      expect(console.info).toHaveBeenCalledWith('info', { key: 'value' });
    });
  });

  describe('Method Binding', () => {
    it('should maintain proper binding when methods are destructured', () => {
      const { log, info, warn, error, debug } = logInstance;
      
      log('test');
      info('test');
      warn('test');
      error('test');
      debug('test');

      expect(console.log).toHaveBeenCalledWith('test');
      expect(console.info).toHaveBeenCalledWith('test');
      expect(console.warn).toHaveBeenCalledWith('test');
      expect(console.error).toHaveBeenCalledWith('test');
      expect(console.debug).toHaveBeenCalledWith('test');
    });
  });

  describe('Configuration Options', () => {
    it('should allow setting custom options', () => {
      const customOptions = {
        type: 'client',
        client: { 
          production: ['warn', 'error']
        }
      };

      logInstance.setOptions(customOptions);
      expect(logInstance.options.type).toBe('client');
      expect(logInstance.options.client.production).toEqual(['warn', 'error']);
      // Verify that default properties are still present
      expect(logInstance.options.client.namespace).toBe('client');
      expect(logInstance.options.client.localStorageOverrideKey).toBe('logLevels');
    });

    it('should merge options with defaults', () => {
      logInstance.setOptions({
        server: { production: ['custom'] }
      });

      expect(logInstance.options.server.production).toEqual(['custom']);
      expect(logInstance.options.client).toBeDefined();
    });
  });

  describe('Production Mode Filtering', () => {
    beforeEach(() => {
      process.env.ORIGINAL_NODE_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
    });

    it('should filter logs in production mode for server', () => {
      const prodLog = new Log();
      prodLog.setOptions({
        type: 'server',
        server: { production: ['error'] }
      });

      prodLog.log('should not log');
      prodLog.info('should not log');
      prodLog.warn('should not log');
      prodLog.error('should log');

      expect(console.log).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('should log');
    });

    it('should filter logs in production mode for client', () => {
      const prodLog = new Log();
      prodLog.setOptions({
        type: 'client',
        client: { production: ['warn', 'error'] }
      });

      prodLog.log('should not log');
      prodLog.info('should not log');
      prodLog.warn('should log');
      prodLog.error('should log');

      expect(console.log).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('should log');
      expect(console.error).toHaveBeenCalledWith('should log');
    });
  });

  describe('Interceptors', () => {
    it('should support adding interceptors', () => {
      const interceptor = jest.fn();
      logInstance.addInterceptor(interceptor);

      logInstance.log('test message');

      expect(interceptor).toHaveBeenCalledWith('log', ['test message']);
    });

    it('should call multiple interceptors in order', () => {
      const interceptor1 = jest.fn();
      const interceptor2 = jest.fn();
      
      logInstance.addInterceptor(interceptor1);
      logInstance.addInterceptor(interceptor2);

      logInstance.info('test');

      expect(interceptor1).toHaveBeenCalledWith('info', ['test']);
      expect(interceptor2).toHaveBeenCalledWith('info', ['test']);
    });

    it('should support removing interceptors', () => {
      const interceptor = jest.fn();
      logInstance.addInterceptor(interceptor);
      logInstance.removeInterceptor(interceptor);

      logInstance.log('test');

      expect(interceptor).not.toHaveBeenCalled();
    });

    it('should pass all arguments to interceptors', () => {
      const interceptor = jest.fn();
      logInstance.addInterceptor(interceptor);

      logInstance.warn('message', 'arg1', { key: 'value' });

      expect(interceptor).toHaveBeenCalledWith('warn', ['message', 'arg1', { key: 'value' }]);
    });
  });

  describe('LocalStorage Override (Client Environment)', () => {
    let clientLogInstance;
    let originalLocalStorage;
    let originalWindow;
    let originalDocument;
    let originalNodeEnv;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      // Save original globals
      originalLocalStorage = global.localStorage;
      originalWindow = global.window;
      originalDocument = global.document;

      // Mock client environment
      global.window = { location: { hostname: 'localhost' } };
      global.document = {};
      global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0
      };

      jest.resetModules(); // Reset modules to get a fresh Log instance
      clientLogInstance = new Log(); // Create new instance for client-specific tests
      clientLogInstance.setOptions({ type: 'client' }); // Explicitly set to client type

      // Spy on the instance's ORIGINAL_CONSOLE_METHODS, not the global console
      jest.spyOn(clientLogInstance.ORIGINAL_CONSOLE_METHODS, 'info').mockImplementation();
      jest.spyOn(clientLogInstance.ORIGINAL_CONSOLE_METHODS, 'warn').mockImplementation();
      jest.spyOn(clientLogInstance.ORIGINAL_CONSOLE_METHODS, 'error').mockImplementation();
      
      // Spy on global console for actual log output verification
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'info').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'debug').mockImplementation();
    });

    afterEach(() => {
      // Restore original globals
      global.localStorage = originalLocalStorage;
      global.window = originalWindow;
      global.document = originalDocument;
      process.env.NODE_ENV = originalNodeEnv;
      jest.restoreAllMocks();
    });

    it('should respect localStorage override for all levels when set to true', () => {
      process.env.NODE_ENV = 'production'; // Simulate production
      clientLogInstance.isProduction = clientLogInstance.detectProductionMode(); // Re-detect after env change
      global.localStorage.getItem.mockReturnValue('true');

      clientLogInstance.log('should log');
      clientLogInstance.info('should log info');
      clientLogInstance.debug('should log debug');

      expect(console.log).toHaveBeenCalledWith('should log');
      expect(console.info).toHaveBeenCalledWith('should log info');
      expect(console.debug).toHaveBeenCalledWith('should log debug');
    });

    it('should respect localStorage override for specific levels', () => {
      process.env.NODE_ENV = 'production';
      clientLogInstance.isProduction = clientLogInstance.detectProductionMode(); // Re-detect
      global.localStorage.getItem.mockReturnValue(JSON.stringify(['log', 'warn']));

      clientLogInstance.log('should log');
      clientLogInstance.info('should not log info');
      clientLogInstance.warn('should log warn');
      clientLogInstance.error('should not log error');

      expect(console.log).toHaveBeenCalledWith('should log');
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('should log warn');
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should provide helper methods for localStorage control and use ORIGINAL_CONSOLE_METHODS for feedback', () => {
      clientLogInstance.enableDebug();
      expect(global.localStorage.setItem).toHaveBeenCalledWith(clientLogInstance.options.client.localStorageOverrideKey, 'true');
      expect(clientLogInstance.ORIGINAL_CONSOLE_METHODS.info).toHaveBeenCalledWith('Debug mode enabled. Refresh page to see all logs.');

      clientLogInstance.enableDebug(['error']);
      expect(global.localStorage.setItem).toHaveBeenCalledWith(clientLogInstance.options.client.localStorageOverrideKey, JSON.stringify(['error']));
      expect(clientLogInstance.ORIGINAL_CONSOLE_METHODS.info).toHaveBeenCalledWith('Debug mode enabled. Refresh page to see all logs.');
      
      clientLogInstance.disableDebug();
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(clientLogInstance.options.client.localStorageOverrideKey);
      expect(clientLogInstance.ORIGINAL_CONSOLE_METHODS.info).toHaveBeenCalledWith('Debug mode disabled. Refresh page to restore production log levels.');
    });

    it('should warn via ORIGINAL_CONSOLE_METHODS if localStorage is not available for helpers', () => {
      delete global.localStorage; // Remove localStorage to simulate unavailability
      
      clientLogInstance.enableDebug();
      expect(clientLogInstance.ORIGINAL_CONSOLE_METHODS.warn).toHaveBeenCalledWith('localStorage not available, cannot enable debug mode.');
      
      clientLogInstance.disableDebug();
      expect(clientLogInstance.ORIGINAL_CONSOLE_METHODS.warn).toHaveBeenCalledWith('localStorage not available, cannot disable debug mode.');
    });
  });
});
