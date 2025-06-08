import { resolve } from 'path';
import { existsSync } from 'fs';

export default {
  sync: (request, options) => {
    // If it's a relative import ending with .js, try to resolve as .ts first
    if (request.startsWith('./') || request.startsWith('../')) {
      if (request.endsWith('.js')) {
        const tsPath = request.replace(/\.js$/, '.ts');
        const resolvedTsPath = resolve(options.basedir, tsPath);
        
        if (existsSync(resolvedTsPath)) {
          return resolvedTsPath;
        }
      }
    }
    
    // Fall back to default resolution
    return options.defaultResolver(request, options);
  },
  
  async: async (request, options) => {
    // If it's a relative import ending with .js, try to resolve as .ts first
    if (request.startsWith('./') || request.startsWith('../')) {
      if (request.endsWith('.js')) {
        const tsPath = request.replace(/\.js$/, '.ts');
        const resolvedTsPath = resolve(options.basedir, tsPath);
        
        if (existsSync(resolvedTsPath)) {
          return resolvedTsPath;
        }
      }
    }
    
    // Fall back to default resolution
    return options.defaultResolver(request, options);
  }
};
