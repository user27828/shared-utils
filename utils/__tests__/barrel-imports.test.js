/**
 * Tests for utils barrel file exports (index.js/index.d.ts)
 * @jest-environment node
 */

describe('Utils Barrel Exports', () => {
  describe('CommonJS Imports', () => {
    it('should export log and Log from barrel file', () => {
      const utils = require('../index.js');
      
      expect(utils).toHaveProperty('log');
      expect(utils).toHaveProperty('Log');
      expect(typeof utils.Log).toBe('function');
      expect(typeof utils.log).toBe('object');
    });

    it('should allow destructured imports', () => {
      const { log, Log } = require('../index.js');
      
      expect(typeof Log).toBe('function');
      expect(typeof log).toBe('object');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should maintain method binding in destructured imports', () => {
      const { log } = require('../index.js');
      
      // Mock console to test binding
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      // Set development mode to ensure logging happens
      process.env.NODE_ENV = 'development';
      log.setOptions({ type: 'server', server: { production: ['log', 'info', 'warn', 'error'] } });
      
      const { info } = log;
      info('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('test message');
      
      consoleSpy.mockRestore();
    });

    it('should export a singleton log instance', () => {
      const utils1 = require('../index.js');
      const utils2 = require('../index.js');
      
      expect(utils1.log).toBe(utils2.log);
    });
  });

  describe('ES6/TypeScript Imports', () => {
    it.skip('should support ES6 import syntax (requires --experimental-vm-modules)', async () => {
      // Use dynamic import to test ES6 module syntax
      const utils = await import('../index.js');
      
      expect(utils).toHaveProperty('log');
      expect(utils).toHaveProperty('Log');
      expect(typeof utils.Log).toBe('function');
      expect(typeof utils.log).toBe('object');
    });

    it.skip('should support named imports (requires --experimental-vm-modules)', async () => {
      const { log, Log } = await import('../index.js');
      
      expect(typeof Log).toBe('function');
      expect(typeof log).toBe('object');
      expect(typeof log.info).toBe('function');
    });

    it.skip('should maintain functionality with ES6 imports (requires --experimental-vm-modules)', async () => {
      const { log } = await import('../index.js');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Set development mode to ensure logging
      process.env.NODE_ENV = 'development';
      log.setOptions({ type: 'server', server: { production: ['log', 'info', 'warn', 'error'] } });
      
      log.warn('test warning');
      
      expect(consoleSpy).toHaveBeenCalledWith('test warning');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Export Consistency', () => {
    it.skip('should have consistent exports between CommonJS and ES6 (requires --experimental-vm-modules)', async () => {
      const commonjsUtils = require('../index.js');
      const es6Utils = await import('../index.js');
      
      expect(Object.keys(commonjsUtils).sort()).toEqual(Object.keys(es6Utils).sort());
      expect(typeof commonjsUtils.log).toBe(typeof es6Utils.log);
      expect(typeof commonjsUtils.Log).toBe(typeof es6Utils.Log);
    });

    it.skip('should export the same log instance between import methods (requires --experimental-vm-modules)', async () => {
      const commonjsUtils = require('../index.js');
      const es6Utils = await import('../index.js');
      
      // Both should reference the same singleton instance
      expect(commonjsUtils.log).toBe(es6Utils.log);
    });
  });

  describe('TypeScript Type Definitions', () => {
    it('should have proper TypeScript declarations', () => {
      // This test ensures that TypeScript types are available
      // The actual type checking is done at compile time
      const utils = require('../index.js');
      
      // These should not throw TypeScript errors (tested at compile time)
      expect(utils.log).toBeDefined();
      expect(utils.Log).toBeDefined();
      
      // Runtime verification that the exports match expected interface
      expect(typeof utils.log.setOptions).toBe('function');
      expect(typeof utils.log.getOptions).toBe('function');
      expect(typeof utils.log.log).toBe('function');
      expect(typeof utils.log.info).toBe('function');
      expect(typeof utils.log.warn).toBe('function');
      expect(typeof utils.log.error).toBe('function');
      expect(typeof utils.log.debug).toBe('function');
    });
  });
});
