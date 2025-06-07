/**
 * Comprehensive import verification tests
 * Tests both CommonJS and ES module imports
 * @jest-environment node
 */

describe('Package Import Verification', () => {
  
  describe('JavaScript CommonJS Imports', () => {
    it('should import from utils barrel file', () => {
      const { log, Log } = require('../../utils/index');
      
      expect(log).toBeDefined();
      expect(typeof log).toBe('object');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
      
      expect(Log).toBeDefined();  
      expect(typeof Log).toBe('function');
      
      // Test instantiation
      const logInstance = new Log();
      expect(logInstance).toBeInstanceOf(Log);
      expect(typeof logInstance.setOptions).toBe('function');
    });

    it('should import directly from log module', () => {
      const { default: logDirect, Log: LogDirect } = require('../../utils/src/log.ts');
      
      expect(logDirect).toBeDefined();
      expect(typeof logDirect).toBe('object');
      expect(typeof logDirect.info).toBe('function');
      
      expect(LogDirect).toBeDefined();
      expect(typeof LogDirect).toBe('function');
      
      // Test that they are the same
      expect(logDirect).toBeInstanceOf(LogDirect);
    });

    it('should have consistent exports between barrel and direct imports', () => {
      const { log: barrelLog, Log: BarrelLog } = require('../../utils/index');
      const { default: directLog, Log: DirectLog } = require('../../utils/src/log'); 
      
      // Should be the same constructor  
      expect(BarrelLog).toBe(DirectLog);
      
      // Should be instances of the same class
      expect(barrelLog).toBeInstanceOf(DirectLog);
      expect(directLog).toBeInstanceOf(BarrelLog);
    });
  });

  describe('Functionality Tests', () => {
    let logInstance;
    
    beforeEach(() => {
      const { Log } = require('../../utils/index');
      logInstance = new Log();
      
      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'info').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should work with imported log instance', () => {
      const { log } = require('../../utils/index');
      
      log.info('test message');
      log.warn('test warning');
      log.error('test error');
      
      expect(console.info).toHaveBeenCalledWith('test message');
      expect(console.warn).toHaveBeenCalledWith('test warning');
      expect(console.error).toHaveBeenCalledWith('test error');
    });

    it('should work with new Log instances', () => {
      logInstance.info('instance message');
      logInstance.warn('instance warning');
      
      expect(console.info).toHaveBeenCalledWith('instance message');
      expect(console.warn).toHaveBeenCalledWith('instance warning');
    });

    it('should support configuration on imported instances', () => {
      const { log } = require('../../utils/index');
      
      // Should not throw
      expect(() => {
        log.setOptions({ 
          type: 'server',
          server: { production: ['error'] }
        });
      }).not.toThrow();
      
      expect(log.options.type).toBe('server');
    });
  });

});
