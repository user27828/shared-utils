const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

describe('GitHub Installation Final Verification', () => {
  let tempDir;
  let packageTarball;

  beforeAll(async () => {
    // Create a tarball of the current package
    console.log('Creating package tarball...');
    const result = execSync('yarn pack --filename shared-utils.tgz', { 
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    
    packageTarball = 'shared-utils.tgz';
    console.log('Created tarball:', packageTarball);

    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-utils-test-'));
    console.log('Created temp dir:', tempDir);

    // Create a minimal package.json in temp directory
    const testPackageJson = {
      "name": "test-consuming-project",
      "version": "1.0.0",
      "type": "module"
    };
    
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(testPackageJson, null, 2)
    );

    // Copy the tarball to temp directory
    const tarballPath = path.join(process.cwd(), packageTarball);
    const tempTarballPath = path.join(tempDir, packageTarball);
    fs.copyFileSync(tarballPath, tempTarballPath);

    console.log('Installing package from tarball...');
    try {
      // Install the package from the tarball using yarn
      execSync(`yarn add @user27828/shared-utils@file:./${packageTarball}`, {
        cwd: tempDir,
        stdio: 'pipe'
      });
      console.log('Package installed successfully');
    } catch (error) {
      console.error('Installation failed:', error.message);
      console.error('stdout:', error.stdout?.toString());
      console.error('stderr:', error.stderr?.toString());
      throw error;
    }
  });

  afterAll(() => {
    // Clean up
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (packageTarball && fs.existsSync(packageTarball)) {
      fs.unlinkSync(packageTarball);
    }
  });

  test('server files are present in installed package', () => {
    const nodeModulesPath = path.join(tempDir, 'node_modules', '@user27828', 'shared-utils');
    expect(fs.existsSync(nodeModulesPath)).toBe(true);

    // Check server dist files
    const serverDistPath = path.join(nodeModulesPath, 'server', 'dist');
    expect(fs.existsSync(serverDistPath)).toBe(true);

    const serverIndexJs = path.join(serverDistPath, 'index.js');
    const serverIndexDts = path.join(serverDistPath, 'index.d.ts');
    const turnstileWorkerJs = path.join(serverDistPath, 'turnstile-worker.js');
    const turnstileWorkerDts = path.join(serverDistPath, 'turnstile-worker.d.ts');

    expect(fs.existsSync(serverIndexJs)).toBe(true);
    expect(fs.existsSync(serverIndexDts)).toBe(true);
    expect(fs.existsSync(turnstileWorkerJs)).toBe(true);
    expect(fs.existsSync(turnstileWorkerDts)).toBe(true);

    // Verify file contents are not empty
    expect(fs.statSync(serverIndexJs).size).toBeGreaterThan(0);
    expect(fs.statSync(serverIndexDts).size).toBeGreaterThan(0);
    expect(fs.statSync(turnstileWorkerJs).size).toBeGreaterThan(0);
    expect(fs.statSync(turnstileWorkerDts).size).toBeGreaterThan(0);
  });

  test('package.json exports are correctly configured', () => {
    const nodeModulesPath = path.join(tempDir, 'node_modules', '@user27828', 'shared-utils');
    const packageJsonPath = path.join(nodeModulesPath, 'package.json');
    
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check server export
    expect(packageJson.exports).toHaveProperty('./server');
    expect(packageJson.exports['./server']).toEqual({
      types: './server/dist/index.d.ts',
      import: './server/dist/index.js',
      default: './server/dist/index.js'
    });
  });

  test('can import from server module', async () => {
    // Create a test file that imports from the server module
    const testFile = path.join(tempDir, 'test-import.mjs');
    const testCode = `
import { OptionsManager } from '@user27828/shared-utils/server';
console.log('Server import successful:', typeof OptionsManager);
`;
    
    fs.writeFileSync(testFile, testCode);

    // Try to run the test file
    try {
      const result = execSync(`node test-import.mjs`, {
        cwd: tempDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      expect(result).toContain('Server import successful:');
      expect(result).toContain('function');
    } catch (error) {
      console.error('Import test failed:', error.message);
      console.error('stdout:', error.stdout?.toString());
      console.error('stderr:', error.stderr?.toString());
      throw error;
    }
  });

  test('can import turnstile worker from server', async () => {
    // Test importing the turnstile worker specifically
    const testFile = path.join(tempDir, 'test-turnstile.mjs');
    const testCode = `
import { createTurnstileWorker } from '@user27828/shared-utils/server';
console.log('Turnstile worker import successful:', typeof createTurnstileWorker);
`;
    
    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(`node test-turnstile.mjs`, {
        cwd: tempDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      expect(result).toContain('Turnstile worker import successful:');
      expect(result).toContain('function');
    } catch (error) {
      console.error('Turnstile import test failed:', error.message);
      console.error('stdout:', error.stdout?.toString());
      console.error('stderr:', error.stderr?.toString());
      throw error;
    }
  });

  test('server source files are included in src directory', () => {
    const nodeModulesPath = path.join(tempDir, 'node_modules', '@user27828', 'shared-utils');
    const serverSrcPath = path.join(nodeModulesPath, 'server', 'dist', 'src');
    
    expect(fs.existsSync(serverSrcPath)).toBe(true);
    
    // Check for turnstile subdirectory
    const turnstilePath = path.join(serverSrcPath, 'turnstile');
    expect(fs.existsSync(turnstilePath)).toBe(true);
    
    // Check for specific files
    const files = [
      'options-manager.js',
      'options-manager.d.ts',
      'turnstile/index.js',
      'turnstile/index.d.ts',
      'turnstile/middleware.js',
      'turnstile/middleware.d.ts',
      'turnstile/turnstile.js',
      'turnstile/turnstile.d.ts'
    ];
    
    files.forEach(file => {
      const filePath = path.join(serverSrcPath, file);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).size).toBeGreaterThan(0);
    });
  });
});
