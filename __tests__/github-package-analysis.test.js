/**
 * GitHub Package Analysis Tests
 * Validates package configuration, file inclusion, and tarball contents
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("GitHub Package Analysis", () => {
  describe("Package Configuration", () => {
    it("should have correct lifecycle scripts for GitHub installation", () => {
      const pkg = require("../package.json");

      console.log("🔍 Package scripts:");
      console.log("  prepare:", pkg.scripts.prepare);
      console.log("  postinstall:", pkg.scripts.postinstall);
      console.log("  build:", pkg.scripts.build);

      // When installing from GitHub, yarn/npm runs these scripts automatically
      expect(pkg.scripts.prepare).toBeDefined();
      expect(pkg.scripts.postinstall).toBeDefined();
      expect(pkg.scripts.build).toBeDefined();

      console.log(
        "✅ Lifecycle scripts are properly configured for GitHub installation",
      );
    });

    it("should have correct package.json exports configuration", () => {
      const pkg = require("../package.json");

      console.log("📋 Package configuration analysis:");
      console.log('   exports["./server"] exists:', !!pkg.exports["./server"]);
      console.log(
        "   files array includes dist:",
        pkg.files.includes("dist/**/*"),
      );

      expect(pkg.files).toContain("dist/**/*");
      expect(pkg.exports["./server"]).toBeDefined();
      expect(pkg.exports["./server"].import).toBe("./dist/server/index.js");
      expect(pkg.exports["./server"].types).toBe("./dist/server/index.d.ts");

      console.log("✅ Package configuration is correct for GitHub installs");
    });
  });

  describe("Yarn Pack Analysis", () => {
    it("should include server files in yarn pack", () => {
      console.log("🔍 Running yarn pack dry-run analysis...");

      const output = execSync("yarn pack --dry-run", {
        encoding: "utf8",
        cwd: path.resolve(__dirname, ".."),
      });

      const lines = output.split("\n");
      const serverFiles = lines.filter((line) => line.includes("dist/server/"));

      console.log(`📊 Found ${serverFiles.length} server files in yarn pack:`);
      serverFiles.slice(0, 10).forEach((file) => {
        console.log(`   ${file.trim()}`);
      });

      if (serverFiles.length > 10) {
        console.log(`   ... and ${serverFiles.length - 10} more server files`);
      }

      expect(serverFiles.length).toBeGreaterThan(0);

      // Check for key files
      const hasIndexJs = serverFiles.some((line) =>
        line.includes("dist/server/index.js"),
      );
      const hasIndexDts = serverFiles.some((line) =>
        line.includes("dist/server/index.d.ts"),
      );

      expect(hasIndexJs).toBe(true);
      expect(hasIndexDts).toBe(true);

      console.log("✅ Server files are included in yarn pack");
    });

    it("should have server files tracked in git repository", () => {
      const gitFiles = execSync("git ls-files", {
        encoding: "utf8",
        cwd: path.resolve(__dirname, ".."),
      });

      const serverDistFiles = gitFiles
        .split("\n")
        .filter((file) => file.startsWith("dist/server/"));

      console.log(
        `📊 Found ${serverDistFiles.length} server files tracked in git:`,
      );
      serverDistFiles.slice(0, 10).forEach((file) => {
        console.log(`   ${file}`);
      });

      expect(serverDistFiles.length).toBeGreaterThan(0);

      console.log("✅ Server dist files are tracked in git repository");
    });
  });

  describe("Tarball Verification", () => {
    let tempDir;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shared-utils-tarball-"));
    });

    afterAll(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("should create tarball with server files included", () => {
      console.log("🧪 Creating and testing actual tarball...");

      const tarballPath = path.join(tempDir, "package.tgz");

      // Create actual tarball
      execSync(`yarn pack --filename "${tarballPath}"`, {
        cwd: path.resolve(__dirname, ".."),
      });

      console.log(`📦 Created tarball: ${tarballPath}`);

      // Extract tarball
      const extractDir = path.join(tempDir, "extraction");
      fs.mkdirSync(extractDir, { recursive: true });

      execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`);

      // Check server files in extracted tarball
      const packageDir = path.join(extractDir, "package");
      const serverDistDir = path.join(packageDir, "dist", "server");

      console.log(`📁 Checking extracted package at: ${packageDir}`);
      console.log(
        `📁 Server dist directory exists: ${fs.existsSync(serverDistDir)}`,
      );

      expect(fs.existsSync(serverDistDir)).toBe(true);

      if (fs.existsSync(serverDistDir)) {
        const files = fs.readdirSync(serverDistDir);
        console.log(`📁 Server dist files in tarball: ${files.join(", ")}`);

        expect(files).toContain("index.js");
        expect(files).toContain("index.d.ts");
      }

      console.log("✅ Server files exist in actual tarball");
    });
  });

  describe("Build Process Validation", () => {
    it("should verify dist files exist after build", () => {
      const distPath = path.resolve(__dirname, "../dist");
      const serverDistPath = path.join(distPath, "server");

      console.log("📁 Dist path:", distPath);
      console.log("📁 Server dist path:", serverDistPath);

      expect(fs.existsSync(distPath)).toBe(true);
      expect(fs.existsSync(serverDistPath)).toBe(true);

      const serverFiles = fs.readdirSync(serverDistPath);
      console.log("📁 Server dist files:", serverFiles);

      expect(serverFiles).toContain("index.js");
      expect(serverFiles).toContain("index.d.ts");

      console.log("✅ Build output is present and correct");
    });

    it("should validate file contents are not empty", () => {
      const serverDistPath = path.resolve(__dirname, "../dist/server");
      const indexJs = path.join(serverDistPath, "index.js");
      const indexDts = path.join(serverDistPath, "index.d.ts");

      expect(fs.existsSync(indexJs)).toBe(true);
      expect(fs.existsSync(indexDts)).toBe(true);

      expect(fs.statSync(indexJs).size).toBeGreaterThan(0);
      expect(fs.statSync(indexDts).size).toBeGreaterThan(0);

      console.log("✅ Built files have content");
    });
  });
});
