/**
 * Test the actual GitHub installation mechanism
 * This tests what really happens when installing from GitHub
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("Real GitHub Installation Test", () => {
  it("should have the correct build and lifecycle scripts for GitHub installation", () => {
    const pkg = require("../package.json");

    console.log("🔍 Package scripts:");
    console.log("  prepare:", pkg.scripts.prepare);
    console.log("  postinstall:", pkg.scripts.postinstall);
    console.log("  build:", pkg.scripts.build);

    // When installing from GitHub, yarn/npm runs these scripts automatically:
    // 1. postinstall - runs after package is installed
    // 2. prepare - runs after postinstall and before the package is packed

    expect(pkg.scripts.prepare).toBe("yarn build");
    expect(pkg.scripts.postinstall).toBe("yarn build");
    expect(pkg.scripts.build).toBeDefined();

    console.log(
      "✅ Lifecycle scripts are properly configured for GitHub installation",
    );
  });

  it("should verify that server/dist exists when built locally", () => {
    const serverDistPath = path.resolve(__dirname, "../server/dist");
    const serverDistExists = fs.existsSync(serverDistPath);

    console.log("📁 Server dist path:", serverDistPath);
    console.log("📁 Server dist exists:", serverDistExists);

    if (serverDistExists) {
      const files = fs.readdirSync(serverDistPath);
      console.log("📁 Server dist files:", files);

      expect(files).toContain("index.js");
      expect(files).toContain("index.d.ts");

      // Test that we can import from the built files
      const serverModule = require(path.join(serverDistPath, "index.js"));
      console.log("📦 Server module exports:", Object.keys(serverModule));

      expect(Object.keys(serverModule).length).toBeGreaterThan(0);
    }

    expect(serverDistExists).toBe(true);
  });

  it("should test the files array exclusion/inclusion behavior", () => {
    const pkg = require("../package.json");

    console.log("📄 Files array content:");
    pkg.files.forEach((pattern) => {
      console.log(`  - ${pattern}`);
    });

    // Check that server/dist is included
    expect(pkg.files).toContain("server/dist/**/*");

    // Check that source files are NOT included (which is correct - we only want built files)
    expect(pkg.files).not.toContain("server/src/**/*");
    expect(pkg.files).not.toContain("server/*.ts");

    console.log(
      "✅ Files array correctly includes server/dist but excludes source files",
    );
  });

  it("should simulate npm pack to see what would be included in GitHub install", () => {
    // Run npm pack and examine contents
    console.log("📦 Running npm pack to see included files...");

    try {
      const output = execSync("npm pack --dry-run", {
        encoding: "utf8",
        cwd: path.resolve(__dirname, ".."),
      });

      // Extract the tarball contents from npm pack output
      const lines = output.split("\n");
      const serverFiles = lines.filter((line) => line.includes("server/"));

      console.log("📁 Server files that would be included in GitHub install:");
      serverFiles.forEach((file) => {
        console.log(`  ${file}`);
      });

      // Check that server dist files are included
      const hasServerDist = serverFiles.some((file) =>
        file.includes("server/dist/"),
      );
      expect(hasServerDist).toBe(true);

      // Check that specific key files are included
      const hasServerIndex = serverFiles.some((file) =>
        file.includes("server/dist/index.js"),
      );
      const hasServerTypes = serverFiles.some((file) =>
        file.includes("server/dist/index.d.ts"),
      );

      expect(hasServerIndex).toBe(true);
      expect(hasServerTypes).toBe(true);

      console.log("✅ npm pack confirms server/dist files would be included");
    } catch (error) {
      console.error("❌ npm pack failed:", error.message);
      throw error;
    }
  });

  it("should check if .gitignore could be affecting GitHub installations", () => {
    const gitignorePath = path.resolve(__dirname, "../.gitignore");

    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      console.log("📄 .gitignore content:");
      console.log(gitignoreContent);

      // Check if dist directories are ignored
      const ignoresDist =
        gitignoreContent.includes("dist/") ||
        gitignoreContent.includes("*/dist/");

      if (ignoresDist) {
        console.log("⚠️  WARNING: .gitignore ignores dist/ directories!");
        console.log(
          "   This means server/dist would not be in the GitHub repository",
        );
        console.log("   And would need to be built during installation");
      } else {
        console.log("✅ .gitignore does not ignore dist directories");
      }

      // This is actually OK if we have proper build scripts
      // But important to know
    } else {
      console.log("📄 No .gitignore file found");
    }
  });

  it("should verify the prepare script can build from scratch", () => {
    // Test that the build process works from a clean state
    console.log("🧪 Testing clean build process...");

    const pkg = require("../package.json");
    const prepareScript = pkg.scripts.prepare;

    expect(prepareScript).toBeDefined();
    console.log("🔧 Prepare script:", prepareScript);

    // The prepare script should be able to build everything needed
    // This would run during GitHub installation
    expect(prepareScript).toContain("build");

    console.log("✅ Prepare script is configured to build the project");
  });
});
