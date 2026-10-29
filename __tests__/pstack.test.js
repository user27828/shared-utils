import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const manager = path.join(repository, "scripts", "pstack.mjs");
const sync = path.join(repository, "scripts", "speckit-sync.sh");
function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

describe("global pstack dispatcher and release manager", () => {
  let fixture, upstream, checkout, home, root, prompts, env;
  const git = (...args) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
      cwd: upstream,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "Synthetic fixture",
    );
    return git("rev-parse", "HEAD");
  };
  const call = (...args) =>
    spawnSync(process.execPath, [manager, ...args], {
      cwd: fixture,
      env,
      encoding: "utf8",
    });
  const successful = (...args) => {
    const result = call(...args);
    if (result.status !== 0) {
      throw new Error(result.stderr);
    }
    return result.stdout;
  };
  const install = () => successful("setup", "--source", checkout);
  const state = () =>
    JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const status = () => JSON.parse(successful("status"));
  const skill = (name, purpose, body = "Use the local fixture.") =>
    write(
      path.join(upstream, "pstack", "skills", name, "SKILL.md"),
      `---\nname: ${name}\ndescription: '${purpose}'\n---\n\n${body}\n`,
    );

  beforeEach(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-behavior-"));
    upstream = path.join(fixture, "upstream");
    checkout = path.join(fixture, "checkout");
    home = path.join(fixture, "home");
    root = path.join(fixture, "installed");
    prompts = path.join(home, ".vscode-server", "data", "User", "prompts");
    fs.mkdirSync(upstream);
    fs.mkdirSync(prompts, { recursive: true });
    env = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      PSTACK_HOME: root,
      PSTACK_PROMPTS_DIR: prompts,
      CODEX_HOME: path.join(fixture, "codex"),
      APPDATA: "",
      XDG_CONFIG_HOME: path.join(home, ".config"),
      SHARED_UTILS_SYNC_CODEX_PRESENT: "1",
      SHARED_UTILS_SYNC_GHCP_PRESENT: "0",
    };
    git("init", "--quiet", "--initial-branch=main");
    skill("poteto-mode", "Choose a workflow.");
    skill(
      "how",
      "Explain fixture behavior.",
      "Read [the fixture](references/input.md).",
    );
    write(
      path.join(upstream, "pstack", "skills", "how", "references", "input.md"),
      "Synthetic reference\n",
    );
    write(path.join(upstream, "LICENSE"), "Synthetic license\n");
    commit();
    execFileSync("git", ["clone", "--quiet", upstream, checkout], {
      encoding: "utf8",
    });
  });

  afterEach(() => {
    fs.rmSync(fixture, { recursive: true, force: true });
  });

  it("offers help without installing or contacting upstream", () => {
    const output = successful("help");
    for (const command of ["help", "list", "upgrade", "sync"]) {
      expect(output).toContain(command);
    }
    expect(fs.existsSync(root)).toBe(false);
  });

  it("installs complete resources and resolves the exact source used by both clients", () => {
    install();
    const location = JSON.parse(successful("resolve", "how"));
    expect(fs.readFileSync(location.skillPath, "utf8")).toContain(
      "references/input.md",
    );
    expect(
      fs.readFileSync(
        path.join(path.dirname(location.skillPath), "references", "input.md"),
        "utf8",
      ),
    ).toBe("Synthetic reference\n");
    expect(location.installationRoot).toBe(path.join(checkout, "pstack"));
    expect(fs.readFileSync(path.join(checkout, "LICENSE"), "utf8")).toBe(
      "Synthetic license\n",
    );
    expect(location.promptDirectory).toBe(prompts);
    expect(fs.existsSync(location.compatibilityPath)).toBe(true);
    expect(
      fs.existsSync(path.join(home, ".agents", "skills", "pstack", "SKILL.md")),
    ).toBe(true);
    expect(successful("help", "how")).toContain("Explain fixture behavior.");
    expect(
      JSON.parse(
        execFileSync(
          process.execPath,
          [path.join(root, "pstack.mjs"), "resolve", "how"],
          { env, encoding: "utf8" },
        ),
      ).skillPath,
    ).toBe(location.skillPath);
  });

  it("uses normal Git upgrades and discovers added workflows without copying upstream", () => {
    install();
    const first = status().revision;
    const overrides = path.join(root, "overrides.md");
    fs.writeFileSync(overrides, "Keep this machine override.\n");
    skill("second", "A newly added workflow.");
    const next = commit();
    successful("upgrade");
    expect(status().revision).toBe(next);
    expect(next).not.toBe(first);
    expect(successful("help")).toContain("second: A newly added workflow.");
    expect(fs.existsSync(path.join(root, "revisions"))).toBe(false);
    expect(fs.readFileSync(overrides, "utf8")).toBe(
      "Keep this machine override.\n",
    );
    expect(JSON.parse(successful("resolve", "second")).skillPath).toBe(
      path.join(checkout, "pstack", "skills", "second", "SKILL.md"),
    );
  });

  it("preserves local source changes and entry points rather than resetting during upgrade", () => {
    install();
    const before = state();
    const entry = fs.readFileSync(
      path.join(prompts, "pstack.prompt.md"),
      "utf8",
    );
    const revision = status().revision;
    const changed = path.join(checkout, "local-notes.txt");
    fs.writeFileSync(changed, "Preserve local work\n");
    expect(call("upgrade").status).not.toBe(0);
    expect(state()).toEqual(before);
    expect(
      fs.readFileSync(path.join(prompts, "pstack.prompt.md"), "utf8"),
    ).toBe(entry);
    expect(status().revision).toBe(revision);
    expect(fs.readFileSync(changed, "utf8")).toBe("Preserve local work\n");
  });

  it("preserves unmanaged prompts and rejects concurrent mutations", () => {
    const source = path.join(prompts, "pstack.prompt.md");
    fs.writeFileSync(source, "User-owned content\n");
    expect(call("setup", "--source", checkout).status).not.toBe(0);
    expect(fs.readFileSync(source, "utf8")).toBe("User-owned content\n");
    expect(fs.existsSync(path.join(root, "config.json"))).toBe(false);
    fs.rmSync(source);
    install();
    const before = state();
    const lock = path.join(root, "operation.lock");
    fs.writeFileSync(lock, "Another operation\n");
    expect(call("upgrade").status).not.toBe(0);
    expect(fs.readFileSync(lock, "utf8")).toBe("Another operation\n");
    expect(state()).toEqual(before);
  });

  it("rejects unknown names, traversal, and option injection", () => {
    install();
    for (const name of ["../how", "--help", "missing", "how/../../outside"]) {
      expect(call("resolve", name).status).not.toBe(0);
    }
    expect(call("upgrade", "--upload-pack=bad").status).not.toBe(0);
  });

  it("resolves read-only source and revision metadata without a Git subprocess", () => {
    install();
    const expected = status().revision;
    execFileSync("git", ["-C", checkout, "pack-refs", "--all"]);
    const linked = path.join(fixture, "linked-worktree");
    execFileSync("git", [
      "-C",
      checkout,
      "worktree",
      "add",
      "--quiet",
      "-b",
      "linked",
      linked,
      "HEAD",
    ]);
    for (const source of [checkout, linked]) {
      successful("setup", "--source", source);
      const result = spawnSync(process.execPath, [manager, "resolve", "how"], {
        cwd: fixture,
        env: { ...env, PATH: "" },
        encoding: "utf8",
      });
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).revision).toBe(expected);
    }
  });

  it("refreshes global entries outside a repository without duplicate Codex skills", () => {
    install();
    const result = spawnSync("bash", [sync, "--global-only"], {
      cwd: fixture,
      env,
      encoding: "utf8",
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(env.CODEX_HOME, "skills", "pstack"))).toBe(
      false,
    );
    expect(
      fs.existsSync(path.join(home, ".agents", "skills", "pstack", "SKILL.md")),
    ).toBe(true);
    expect(fs.existsSync(path.join(fixture, ".specify"))).toBe(false);
    expect(fs.existsSync(path.join(fixture, ".github"))).toBe(false);
    expect(
      fs.existsSync(path.join(env.CODEX_HOME, "prompts", "pstack.md")),
    ).toBe(true);
    const native = path.join(home, ".agents", "skills", "pstack", "SKILL.md");
    const timestamp = fs.statSync(native).mtimeMs;
    successful("sync");
    expect(fs.statSync(native).mtimeMs).toBe(timestamp);
    const again = spawnSync("bash", [sync, "--global-only"], {
      cwd: fixture,
      env,
      encoding: "utf8",
    });
    expect(again.status).toBe(0);
    expect(fs.statSync(native).mtimeMs).toBe(timestamp);
    const conflict = spawnSync("bash", [sync, "--global-only", "--no-global"], {
      cwd: fixture,
      env,
      encoding: "utf8",
    });
    expect(conflict.status).not.toBe(0);
  });

  it("delegates plugin upgrades as executable arguments without shell interpolation", () => {
    const plugin = path.join(fixture, "plugin");
    fs.cpSync(path.join(checkout, "pstack"), plugin, { recursive: true });
    const updater = path.join(fixture, "updater.mjs");
    const literal = "literal;$(not-a-command)";
    write(
      updater,
      "import fs from 'node:fs'; fs.writeFileSync('received.txt', process.argv[2]);\n",
    );
    successful(
      "setup",
      "--source",
      plugin,
      "--upgrade-command",
      JSON.stringify([process.execPath, updater, literal]),
    );
    successful("upgrade");
    expect(fs.readFileSync(path.join(plugin, "received.txt"), "utf8")).toBe(
      literal,
    );
    expect(status().revision).toBe(null);
    expect(call("setup", "--upgrade-command", "echo unsafe").status).not.toBe(
      0,
    );
  });

  it("does not read skill symlinks outside the selected installation", () => {
    install();
    const outside = path.join(fixture, "outside.md");
    write(outside, "---\nname: outside\ndescription: Must not load.\n---\n");
    const target = path.join(checkout, "pstack", "skills", "how", "SKILL.md");
    fs.rmSync(target);
    fs.symlinkSync(outside, target);
    expect(call("resolve", "how").status).not.toBe(0);
  });
});
