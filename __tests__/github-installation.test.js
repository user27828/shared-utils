/**
 * Test GitHub installation behavior
 * This test simulates what happens when someone installs the package from GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('GitHub Installation Simulation', () => {
  const testDir = '/tmp/github-install-test';
  const packagePath = path.resolve(__dirname, '..');

  beforeAll(() => {
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
  });

  it('should have build scripts that run during GitHub installation', () => {
    const pkg = require('../package.json');
    
    // Check for scripts that would run during GitHub installation
    expect(pkg.scripts.prepare || pkg.scripts.postinstall || pkg.scripts.build).toBeDefined();
    
    if (pkg.scripts.prepare) {
      console.log('✅ Found prepare script:', pkg.scripts.prepare);
    }
    if (pkg.scripts.postinstall) {
      console.log('✅ Found postinstall script:', pkg.scripts.postinstall);
    }
    if (pkg.scripts.build) {
      console.log('✅ Found build script:', pkg.scripts.build);
    }
  });

  it('should create a simulated GitHub clone and test file inclusion', () => {
    // Create a test project
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      type: 'module'
    }, null, 2));

    // Copy the package to simulate GitHub clone (excluding node_modules and .git)
    const targetDir = path.join(testDir, 'node_modules/@user27828/shared-utils');
    fs.mkdirSync(targetDir, { recursive: true });

    // Copy essential files that would be in a GitHub repo
    const filesToCopy = [
      'package.json',
      'tsconfig.json',
      'index.js'
    ];

    // Copy directories that would be in GitHub
    const dirsToCopy = [
      'client',
      'utils', 
      'server',
      'bin',
      'scripts'
    ];

    filesToCopy.forEach(file => {
      const srcPath = path.join(packagePath, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(targetDir, file));
      }
    });

    dirsToCopy.forEach(dir => {
      const srcPath = path.join(packagePath, dir);
      if (fs.existsSync(srcPath)) {
        execSync(`cp -r "${srcPath}" "${targetDir}/"`, { stdio: 'pipe' });
      }
    });

    console.log('📁 Simulated GitHub clone structure:');
    const clonedFiles = execSync(`find "${targetDir}" -type f | head -20`, { encoding: 'utf8' });
    console.log(clonedFiles);

    // Check if server source files exist in the "clone"
    const serverSrcExists = fs.existsSync(path.join(targetDir, 'server/src'));
    const serverTsExists = fs.existsSync(path.join(targetDir, 'server/index.ts'));
    
    expect(serverSrcExists).toBe(true);
    expect(serverTsExists).toBe(true);
    
    console.log('✅ Server source files exist in simulated clone');
  });

  it('should simulate build process during GitHub installation', () => {
    const targetDir = path.join(testDir, 'node_modules/@user27828/shared-utils');
    
    // Check current working directory and build
    process.chdir(targetDir);
    console.log('📍 Changed to target directory:', process.cwd());
    
    try {
      // Try to install dependencies first (this would happen during GitHub install)
      console.log('🔄 Installing dependencies...');
      execSync('yarn install', { stdio: 'pipe' });
      
      // Run build (this should happen during prepare/postinstall)
      console.log('🔄 Running build...');
      execSync('yarn build', { stdio: 'pipe' });
      
      // Check if server/dist was created
      const serverDistExists = fs.existsSync('server/dist');
      const serverDistFiles = serverDistExists ? fs.readdirSync('server/dist') : [];
      
      console.log('📁 Server dist exists:', serverDistExists);
      if (serverDistExists) {
        console.log('📁 Server dist files:', serverDistFiles);
      }
      
      expect(serverDistExists).toBe(true);
      expect(serverDistFiles).toContain('index.js');
      expect(serverDistFiles).toContain('index.d.ts');
      
      console.log('✅ Build process creates server/dist files');
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      throw error;
    }
  });

  it('should verify server imports work from built package', () => {
    const targetDir = path.join(testDir, 'node_modules/@user27828/shared-utils');
    process.chdir(targetDir);
    
    // Test importing server module
    const testScript = `
      try {
        const server = require('./server/dist/index.js');
        console.log('✅ Server import successful');
        console.log('📦 Available exports:', Object.keys(server));
        process.exit(0);
      } catch (error) {
        console.error('❌ Server import failed:', error.message);
        process.exit(1);
      }
    `;
    
    try {
      const output = execSync(`node -e "${testScript}"`, { encoding: 'utf8' });
      console.log(output);
      
      // If we get here, the import worked
      expect(true).toBe(true);
    } catch (error) {
      console.error('Import test failed:', error.message);
      throw error;
    }
  });

  it('should check if files array includes server/dist', () => {
    const pkg = require('../package.json');
    
    expect(pkg.files).toContain('server/dist/**/*');
    console.log('✅ package.json files array includes server/dist/**/*');
    
    // Also check all files entries
    console.log('📄 All files entries:', pkg.files);
  });
});
