import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const syncScript = path.join(repositoryRoot, "scripts", "speckit-sync.sh");

const writeFile = (filePath, contents) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

describe("shared Spec-Kit and Codex synchronization", () => {
  let fixtureRoot;
  let codexHome;

  beforeEach(() => {
    fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "shared-utils-speckit-sync-"),
    );
    codexHome = path.join(fixtureRoot, "codex");

    fs.mkdirSync(path.join(fixtureRoot, ".specify"), { recursive: true });
    writeFile(path.join(fixtureRoot, "AGENTS.md"), "# Fixture instructions\n");
    writeFile(
      path.join(fixtureRoot, ".github", "prompts", "speckit.test.prompt.md"),
      "---\ndescription: Fixture Spec-Kit command\n---\n\nTest command.\n",
    );

    // Reuse the test repository's read-only Git metadata so the fixture does
    // not need to create another repository or write to the worktree.
    fs.symlinkSync(
      path.join(repositoryRoot, ".git"),
      path.join(fixtureRoot, ".git"),
    );

    writeFile(
      path.join(
        fixtureRoot,
        "home",
        ".vscode-server",
        "data",
        "User",
        "prompts",
        "yarn-upgrade.prompt.md",
      ),
      "---\ndescription: Yarn upgrade stability checks\nargument-hint: [packages]\n---\n\nRun the upgrade workflow.\n",
    );

    writeFile(
      path.join(codexHome, "skills", "implement", "SKILL.md"),
      "---\nname: implement\ndescription: Existing adapter\n---\n\nExisting skill.\n",
    );
    writeFile(
      path.join(codexHome, "skills", "stale", "SKILL.md"),
      "---\nname: stale\ndescription: Stale adapter\n---\n<!-- spec-kit-bridge-managed: true -->\n<!-- spec-kit-bridge-prompt-id: stale -->\n",
    );
    writeFile(
      path.join(codexHome, "prompts", "stale.md"),
      "---\nspec-kit-bridge-managed: true\nspec-kit-bridge-prompt-id: stale\n---\n",
    );
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("creates a native prompt mirror and a bare skill for global prompts", () => {
    const sourcePromptPath = path.join(
      fixtureRoot,
      "home",
      ".vscode-server",
      "data",
      "User",
      "prompts",
      "yarn-upgrade.prompt.md",
    );

    execFileSync("bash", [syncScript], {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        HOME: path.join(fixtureRoot, "home"),
        CODEX_HOME: codexHome,
        SHARED_UTILS_SYNC_CODEX_PRESENT: "1",
        SHARED_UTILS_SYNC_GHCP_PRESENT: "0",
        XDG_CONFIG_HOME: path.join(fixtureRoot, "unused-xdg"),
        APPDATA: "",
      },
      encoding: "utf8",
    });

    const nativePromptPath = path.join(codexHome, "prompts", "yarn-upgrade.md");
    const skillPath = path.join(
      codexHome,
      "skills",
      "yarn-upgrade",
      "SKILL.md",
    );
    const nativePrompt = fs.readFileSync(nativePromptPath, "utf8");
    const skill = fs.readFileSync(skillPath, "utf8");

    expect(nativePrompt).toContain("spec-kit-bridge-prompt-id: yarn-upgrade");
    expect(nativePrompt).toContain(`Read \`${sourcePromptPath}\`.`);
    expect(skill).toMatch(
      /^---\nname: yarn-upgrade\ndescription: 'Yarn upgrade stability checks'\n---\n/,
    );
    expect(skill).toContain("<!-- spec-kit-bridge-managed: true -->");
    expect(skill).toContain(
      "Read the source prompt completely at invocation time.",
    );
    expect(skill).toContain(
      "Pass the user text after the slash command as the prompt arguments.",
    );

    expect(
      fs.existsSync(path.join(codexHome, "skills", "implement", "SKILL.md")),
    ).toBe(true);
    expect(fs.existsSync(path.join(codexHome, "skills", "stale"))).toBe(false);
    expect(fs.existsSync(path.join(codexHome, "prompts", "stale.md"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(codexHome, "skills", "speckit.test"))).toBe(
      false,
    );
  });

  it("skips before syncing when neither client is available", () => {
    fs.rmSync(codexHome, { recursive: true, force: true });

    const output = execFileSync("bash", [syncScript], {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        HOME: path.join(fixtureRoot, "home"),
        CODEX_HOME: codexHome,
        SHARED_UTILS_SYNC_CODEX_PRESENT: "0",
        SHARED_UTILS_SYNC_GHCP_PRESENT: "0",
        XDG_CONFIG_HOME: path.join(fixtureRoot, "unused-xdg"),
        APPDATA: "",
      },
      encoding: "utf8",
    });

    expect(output).toContain(
      "Spec-Kit sync skipped: neither GitHub Copilot nor Codex was detected.",
    );
    expect(
      fs.existsSync(path.join(fixtureRoot, ".specify", "spec-kit-bridge.md")),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(fixtureRoot, ".github", "copilot-instructions.md"),
      ),
    ).toBe(false);
    expect(fs.existsSync(codexHome)).toBe(false);
  });

  it("syncs the Copilot bridge without creating Codex files", () => {
    fs.rmSync(codexHome, { recursive: true, force: true });
    const extensionsDir = path.join(fixtureRoot, "vscode-extensions");
    fs.mkdirSync(path.join(extensionsDir, "github.copilot-chat-test"), {
      recursive: true,
    });

    execFileSync("bash", [syncScript], {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        HOME: path.join(fixtureRoot, "home"),
        CODEX_HOME: codexHome,
        VSCODE_EXTENSIONS_DIR: extensionsDir,
        SHARED_UTILS_SYNC_CODEX_PRESENT: "0",
        SHARED_UTILS_SYNC_GHCP_PRESENT: "",
        XDG_CONFIG_HOME: path.join(fixtureRoot, "unused-xdg"),
        APPDATA: "",
      },
      encoding: "utf8",
    });

    expect(
      fs.existsSync(path.join(fixtureRoot, ".specify", "spec-kit-bridge.md")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(fixtureRoot, ".github", "copilot-instructions.md"),
      ),
    ).toBe(true);
    expect(fs.existsSync(codexHome)).toBe(false);
  });
});
