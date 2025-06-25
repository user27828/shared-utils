const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

describe("Yarn GitHub Installation Test", () => {
  let tempDir;

  beforeAll(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yarn-github-test-"));
    console.log("Created temp dir:", tempDir);

    // Create a minimal package.json in temp directory
    const testPackageJson = {
      name: "test-yarn-consuming-project",
      version: "1.0.0",
      type: "module",
    };

    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(testPackageJson, null, 2),
    );

    console.log("Installing package from GitHub with yarn...");
    try {
      // Install the package from GitHub using yarn
      const result = execSync(
        `yarn add @user27828/shared-utils@github:user27828/shared-utils#master`,
        {
          cwd: tempDir,
          stdio: "pipe",
          encoding: "utf8",
        },
      );
      console.log("Package installed successfully");
      console.log("Installation output:", result);
    } catch (error) {
      console.error("Installation failed:", error.message);
      console.error("stdout:", error.stdout?.toString());
      console.error("stderr:", error.stderr?.toString());
      // Don't throw here, let the tests verify what we can
    }
  });

  afterAll(() => {
    // Clean up
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("package is installed in node_modules", () => {
    const nodeModulesPath = path.join(
      tempDir,
      "node_modules",
      "@user27828",
      "shared-utils",
    );
    expect(fs.existsSync(nodeModulesPath)).toBe(true);
  });

  test("server files are present in installed package", () => {
    const nodeModulesPath = path.join(
      tempDir,
      "node_modules",
      "@user27828",
      "shared-utils",
    );

    // Check if package directory exists first
    if (!fs.existsSync(nodeModulesPath)) {
      console.error("Package not found at:", nodeModulesPath);
      throw new Error(
        "Package installation failed - package directory not found",
      );
    }

    // List contents of installed package
    const packageContents = fs.readdirSync(nodeModulesPath);
    console.log("Package contents:", packageContents);

    // Check server dist files
    const serverDistPath = path.join(nodeModulesPath, "server", "dist");

    if (!fs.existsSync(serverDistPath)) {
      console.error("Server dist path not found:", serverDistPath);
      console.log(
        "Server directory contents:",
        fs.existsSync(path.join(nodeModulesPath, "server"))
          ? fs.readdirSync(path.join(nodeModulesPath, "server"))
          : "server directory does not exist",
      );
      throw new Error("Server dist directory not found");
    }

    console.log("Server dist contents:", fs.readdirSync(serverDistPath));

    const serverIndexJs = path.join(serverDistPath, "index.js");
    const serverIndexDts = path.join(serverDistPath, "index.d.ts");

    expect(fs.existsSync(serverIndexJs)).toBe(true);
    expect(fs.existsSync(serverIndexDts)).toBe(true);

    // Verify file contents are not empty
    expect(fs.statSync(serverIndexJs).size).toBeGreaterThan(0);
    expect(fs.statSync(serverIndexDts).size).toBeGreaterThan(0);
  });

  test("can import from server module after GitHub install", async () => {
    const nodeModulesPath = path.join(
      tempDir,
      "node_modules",
      "@user27828",
      "shared-utils",
    );

    // Skip test if package not installed
    if (!fs.existsSync(nodeModulesPath)) {
      console.log("Skipping import test - package not installed");
      return;
    }

    // Create a test file that imports from the server module
    const testFile = path.join(tempDir, "test-server-import.mjs");
    const testCode = `
try {
  const serverModule = await import('@user27828/shared-utils/server');
  console.log('Server import successful');
  console.log('Available exports:', Object.keys(serverModule));
} catch (error) {
  console.error('Server import failed:', error.message);
  process.exit(1);
}
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(`node test-server-import.mjs`, {
        cwd: tempDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      console.log("Import test result:", result);
      expect(result).toContain("Server import successful");
    } catch (error) {
      console.error("Import test failed:", error.message);
      console.error("stdout:", error.stdout?.toString());
      console.error("stderr:", error.stderr?.toString());
      throw error;
    }
  });
});
