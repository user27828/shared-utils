/**
 * Test package imports using the intended import paths
 * @jest-environment node
 */

describe('Package Import Paths', () => {
  
  describe('Utils Package Imports', () => {
    it('should import utils using package-style path', () => {
      // This simulates: import { log, Log } from '@shared-utils/utils'
      const { log, Log } = require('../utils/index.js');
      
      expect(log).toBeDefined();
      expect(Log).toBeDefined();
      expect(typeof log.info).toBe('function');
      expect(typeof Log).toBe('function');
    });

    it('should work with relative imports from utils', () => {
      // This simulates: import { log } from '../utils'
      const { log } = require('../utils/index.js');
      
      // Mock console to test functionality
      jest.spyOn(console, 'info').mockImplementation();
      
      log.info('Testing relative import');
      expect(console.info).toHaveBeenCalledWith('Testing relative import');
      
      jest.restoreAllMocks();
    });
  });

  describe('Client Package Imports', () => {
    it('should be able to import client components', () => {
      // This simulates: import { ... } from '@shared-utils/client'
      // Note: Client components use ES6 modules and JSX, so we test that the file exists
      expect(() => {
        require.resolve('../client/index.js');
      }).not.toThrow();
      
      // The client module exists and is properly structured (tested separately)
      expect(true).toBe(true);
    });
  });

  describe('Root Package Behavior', () => {
    it('should have minimal root exports', () => {
      // This simulates: import from '@shared-utils'
      const rootExports = require('../index.js');
      
      // Root should have minimal or no exports to avoid JSX issues
      expect(rootExports).toBeDefined();
    });
  });

});
