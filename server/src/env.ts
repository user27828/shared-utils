/**
 * Load environment variables for the server
 * This module intentionally avoids forcing consumers to install express
 * or dotenv at runtime. It will only attempt to load dotenv when a
 * sensible .env file is discovered near the calling project.
 */
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createRequire } from "module";
import { isEmpty } from "lodash-es";

// Avoid a hard dependency on express at runtime — accept a light-typed Request
type MaybeRequest =
  | { headers?: Record<string, any>; secure?: boolean }
  | unknown;

// Create a singleton for environment variables
let envCache: Record<string, any> | null = null;

// Forward-declare optionsManager so helper functions that run before the
// full initialization can reference it without causing TDZ errors.
let optionsManager: any = undefined;

// Maintain a canonical list of environment variables to exclude when we are
// not reading variables from a .env file. These are common platform/dev
// variables that should not be returned as part of the public `env` object
// when we are attempting to present a curated environment for consumers.
const EXCLUDE_WHEN_NO_ENV = new Set(
  [
    "LESSOPEN",
    "CONDA_PROMPT_MODIFIER",
    "USER",
    "npm_config_user_agent",
    "WSLNET_PATH",
    "GIT_ASKPASS",
    "npm_node_execpath",
    "SHLVL",
    "CONDA_SHLVL",
    "OLDPWD",
    "TERM_PROGRAM_VERSION",
    "NVM_BIN",
    "VSCODE_IPC_HOOK_CLI",
    "npm_package_json",
    "NVM_INC",
    "COREPACK_ROOT",
    "VSCODE_GIT_ASKPASS_MAIN",
    "VSCODE_GIT_ASKPASS_NODE",
    "N_PREFIX",
    "DBUS_SESSION_BUS_ADDRESS",
    "COLORTERM",
    "_CE_M",
    "WSL_DISTRO_NAME",
    "NVM_DIR",
    "NPM_TOKEN",
    "WAYLAND_DISPLAY",
    "ANDROID_ADB",
    "COREPACK_ENABLE_DOWNLOAD_PROMPT",
    "FORCE_COLOR",
    "LOGNAME",
    "NAME",
    "WSL_INTEROP",
    "PULSE_SERVER",
    "_",
    "_CE_CONDA",
    "npm_package_name",
    "XDG_RUNTIME_DIR",
    "LS_COLORS",
    "VSCODE_GIT_IPC_HANDLE",
    "TERM_PROGRAM",
    "CONDA_PYTHON_EXE",
    "PROJECT_CWD",
    "npm_package_version",
    "npm_lifecycle_event",
    "LESSCLOSE",
    "CONDA_DEFAULT_ENV",
    "VSCODE_GIT_ASKPASS_EXTRA_ARGS",
    "GIT_PAGER",
    "BERRY_BIN_FOLDER",
    "npm_execpath",
    "CONDA_EXE",
    "ANDROID_HOME",
    "NVM_CD_FLAGS",
    "XDG_DATA_DIRS",
    "CONDA_PREFIX",
    "WSL2_GUI_APPS_ENABLED",
    "HOSTTYPE",
    "WSLENV",
  ].map(String),
);

// Minimal logger that prefers a global `log` if provided by the caller,
// otherwise prefer the package's `log` export from utils, and finally
// fall back to a console logger.
const getLogger = () => {
  // Use a global log if the calling project provided one
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g && g.log && typeof g.log.info === "function") {
    return g.log;
  }

  // Minimal console-based logger used as a last-resort fallback
  const consoleLogger = {
    info: (...args: any[]) => console.info(...args),
    warn: (...args: any[]) => console.warn(...args),
    debug: (...args: any[]) =>
      typeof console.debug === "function"
        ? console.debug(...args)
        : console.log(...args),
  };

  try {
    // Try common package import specifiers first (works when this package
    // is installed into a consumer project), then fall back to the relative
    // path used in development/monorepo layouts.
    let pkg: any = undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      pkg = require("@user27828/shared-utils");
    } catch (e) {
      // ignore
    }

    if (!pkg) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        pkg = require("@user27828/shared-utils/utils");
      } catch (e) {
        // ignore
      }
    }

    if (!pkg) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        pkg = require("../utils/index.js");
      } catch (e) {
        // ignore
      }
    }

    // If we found a package logger, we'll prefer the deterministic rule:
    // read ENV_JSON_KEYS only from the parsed dotenv (if present) rather
    // than attempting to require or parse consumer files. Consumers should
    // declare ENV_JSON_KEYS in their .env file as a CSV string
    // (for example: ENV_JSON_KEYS=LLM_DEFAULT,LLM_FALLBACK).
    if (pkg && pkg.log && typeof pkg.log.info === "function") {
      try {
        // Intentionally no-op here: dotenv parsing below will handle
        // reading ENV_JSON_KEYS from the .env file and populate the
        // in-memory envCache accordingly.
      } catch (e) {
        // ignore consumer inspection failures
      }

      // Return the package logger when available
      return pkg.log;
    }

    // Fall back to console-based logger when no package/global logger is available
    return consoleLogger as any;
  } catch (e) {
    // If the logging discovery path fails, return console logger
    return consoleLogger as any;
  }
};

const log = getLogger();

// Silence verbose debug output during test runs. Tests (Jest) set
// NODE_ENV=test which makes these messages noisy in test logs.
const __isTestEnv = process.env.NODE_ENV === "test";
const maybeDebug = (...args: any[]) => {
  if (__isTestEnv) {
    return;
  }
  try {
    if (log && typeof log.debug === "function") {
      log.debug(...args);
    }
  } catch (__) {
    // ignore
  }
};

/**
 * Build a base environment object derived from process.env but excluding
 * noisy platform variables when no .env file was present.
 */
const buildBaseEnv = (opts?: { excludePlatform?: boolean }) => {
  const excludePlatform = opts?.excludePlatform === true;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (excludePlatform && EXCLUDE_WHEN_NO_ENV.has(k)) {
      continue;
    }
    out[k] = v;
  }
  return out;
};

// Integrate with OptionsManager if available
// Use a global registry approach to ensure singleton behavior across modules

// Check if optionsManager is already registered globally
if (typeof globalThis !== "undefined") {
  const g = globalThis as any;
  // Support test-injected package shim: some tests attach a mock package
  // to globalThis.__shared_utils_pkg = { optionsManager } so detect that
  // and prefer it before attempting to require the real package.
  if (g.__shared_utils_pkg && g.__shared_utils_pkg.optionsManager) {
    g.__shared_utils_optionsManager = g.__shared_utils_pkg.optionsManager;
  }
  if (!g.__shared_utils_optionsManager) {
    // Try to load the real optionsManager and register it globally
    try {
      let pkg: any = undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        pkg = require("@user27828/shared-utils/utils");
      } catch (e) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
          pkg = require("../utils/index.js");
        } catch (e2) {
          // ignore
        }
      }

      if (pkg && pkg.optionsManager) {
        g.__shared_utils_optionsManager = pkg.optionsManager;
      }
    } catch (e) {
      // ignore import errors during early module evaluation
    }
  }

  // Use the globally registered optionsManager
  optionsManager = g.__shared_utils_optionsManager;
}

// If we still don't have optionsManager, create a minimal one that will be replaced later
if (!optionsManager) {
  // Create a minimal in-memory optionsManager to avoid hard failures in
  // consumers that don't install @user27828/shared-utils/utils.
  const _managers = new Map<string, any>();

  optionsManager = {
    registerManager(name: string, manager: any) {
      _managers.set(name, manager);
    },
    getManager(name: string) {
      return _managers.get(name);
    },
    // allow consumers to set global options if needed
    setGlobalOptions(_opts: any) {
      // noop for minimal implementation
    },
  } as any;

  // Provide a tiny local OptionsManager class used when the real module
  // isn't available. It supports the small API used in this file.
  class LocalOptionsManager {
    name: string;
    options: Record<string, any>;
    constructor(name: string, initial: Record<string, any> = {}) {
      this.name = name;
      this.options = { ...(initial || {}) };
    }
    getOption(key: string) {
      return this.options[key];
    }
    setOption(obj: Record<string, any>) {
      for (const [k, v] of Object.entries(obj || {})) {
        this.options[k] = v;
      }
    }
    getOptions() {
      return { ...this.options };
    }
  }

  // Attach LocalOptionsManager constructor so other code that attempts to
  // require the options-manager module can still construct a manager when
  // needed via our internal registration flow.
  (optionsManager as any).__LocalOptionsManager = LocalOptionsManager;
}

const findEnvFile = (): string | null => {
  // If an options manager exists, allow callers to override the dotenv path
  try {
    const override =
      optionsManager && typeof optionsManager.getOption === "function"
        ? optionsManager.getOption("DOTENV_PATH")
        : undefined;
    if (override) {
      // DOTENV_PATH override observed via options manager; no debug logs in
      // production code.
      try {
        const resolved = path.isAbsolute(override)
          ? override
          : path.resolve(process.cwd(), String(override));
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      } catch (e) {
        // ignore invalid override
      }
    }
  } catch (e) {
    // ignore options manager errors and continue discovery
  }

  const candidates = new Set<string>();

  // 1) Project cwd (calling project)
  try {
    const cwd = process.cwd();
    candidates.add(path.resolve(cwd, ".env"));
    candidates.add(path.resolve(cwd, "config/.env"));
    candidates.add(path.resolve(cwd, "envs/.env"));
  } catch (e) {
    // ignore
  }

  // 2) Starting from the calling project's cwd, walk up until we reach
  // the directory above a node_modules (or the filesystem root). This
  // prevents treating this package's own tree as a project root.
  try {
    let dir = process.cwd();
    for (let i = 0; i < 10 && dir !== path.resolve(dir, ".."); i++) {
      candidates.add(path.resolve(dir, ".env"));
      candidates.add(path.resolve(dir, "config/.env"));
      candidates.add(path.resolve(dir, "envs/.env"));

      // If this directory contains node_modules, include its parent and stop
      const nm = path.resolve(dir, "node_modules");
      if (fs.existsSync(nm)) {
        const parent = path.resolve(dir, "..");
        candidates.add(path.resolve(parent, ".env"));
        break;
      }

      dir = path.resolve(dir, "..");
    }
  } catch (e) {
    // ignore
  }

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) {
      // ignore
    }
  }

  return null;
};

/**
 * Compute a stable, project-unique fallback secret key.
 * Uses package.json content and the project cwd to generate a hash.
 */
const computeProjectFallbackKey = (): string => {
  try {
    const cwd = process.cwd();
    const pkgPath = path.resolve(cwd, "package.json");
    let seed = cwd;
    if (fs.existsSync(pkgPath)) {
      try {
        seed += "|" + fs.readFileSync(pkgPath, "utf8");
      } catch (e) {
        // ignore read failures
      }
    }
    return crypto.createHash("sha256").update(seed).digest("hex");
  } catch (e) {
    // fallback to a timestamp-derived stable-ish value
    return String(Math.abs(Date.now())).slice(-16);
  }
};

/**
 * Load environment variables from file if present, else rely on .env
 */
const loadEnvironmentVariables = (): Record<string, any> => {
  if (envCache !== null) {
    log.debug("[ENV DEBUG] Returning cached environment");
    return envCache;
  }

  log.debug("[ENV DEBUG] Loading environment for first time");
  const envPath = findEnvFile();
  log.debug(`[ENV DEBUG] Evaluated env path: ${envPath}`);
  // If optionsManager provides DETECT_ENV_VARS, and all keys are already present
  // in process.env, we should skip loading .env to avoid overwriting caller state.
  try {
    const detect =
      optionsManager && typeof optionsManager.getOption === "function"
        ? optionsManager.getOption("DETECT_ENV_VARS")
        : undefined;
    if (Array.isArray(detect) && detect.length > 0) {
      const allPresent = detect.every(
        (k: string) => process.env[k] !== undefined,
      );
      if (allPresent) {
        // Ensure we still expose ENV via options manager. Build a curated
        // env object that excludes noisy platform variables when we haven't
        // loaded a .env file.
        const base = buildBaseEnv({ excludePlatform: true });
        try {
          if (
            optionsManager &&
            typeof optionsManager.setGlobalOptions === "function"
          ) {
            // Register ENV manager before setting global options
            try {
              const existing =
                typeof optionsManager.getManager === "function"
                  ? optionsManager.getManager("ENV")
                  : undefined;

              if (!existing) {
                let envManagerRegistered = false;

                // Try LocalOptionsManager first
                const LocalCtor = (optionsManager as any).__LocalOptionsManager;
                if (typeof LocalCtor === "function") {
                  try {
                    const m = new LocalCtor("ENV", { ...base });
                    if (typeof optionsManager.registerManager === "function") {
                      optionsManager.registerManager("ENV", m);
                      envManagerRegistered = true;
                    }
                  } catch (e) {
                    // ignore constructor failures
                  }
                }

                // Fallback to minimal manager
                if (!envManagerRegistered) {
                  try {
                    const minimal = {
                      options: { ...base },
                      getOption(key?: string) {
                        if (key === undefined) return { ...this.options };
                        return this.options[key];
                      },
                      setOption(obj: Record<string, any>) {
                        for (const [k, v] of Object.entries(obj || {})) {
                          this.options[k] = v;
                        }
                      },
                      getOptions() {
                        return { ...this.options };
                      },
                    } as any;
                    if (typeof optionsManager.registerManager === "function") {
                      optionsManager.registerManager("ENV", minimal);
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              }
            } catch (e) {
              // ignore registration errors
            }

            try {
              optionsManager.setGlobalOptions({
                ENV: { ...base },
                __READONLY__: true,
              });
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
        envCache = {
          ...base,
          SERVER_PORT: base.SERVER_PORT || process.env.SERVER_PORT || "3001",
          CLIENT_URL: base.CLIENT_URL || process.env.CLIENT_URL || "",
          EXPRESS_SECRET_KEY:
            base.EXPRESS_SECRET_KEY ||
            process.env.EXPRESS_SECRET_KEY ||
            computeProjectFallbackKey(),
          FILE_HANDLER:
            base.FILE_HANDLER || process.env.FILE_HANDLER || "local",
        };
        return envCache;
      }
    }
  } catch (e) {
    // ignore option manager read errors and proceed
  }

  if (envPath) {
    try {
      // Dynamically require dotenv only if we found a file to load. Use
      // createRequire to work in ESM environments where `require` isn't defined.
      // Use a require rooted at the caller project's package.json so this
      // module doesn't rely on import.meta which may be disallowed by some
      // downstream TypeScript compile settings. Using the consumer's
      // package.json path ensures modules are resolved relative to the
      // calling project.
      const req = createRequire(path.resolve(process.cwd(), "package.json"));
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const dotenv = req("dotenv");
      const { parsed, error } = dotenv.config({ path: envPath });
      if (error) {
        console.warn(`Error loading ${envPath}:`, error);
      } else if (parsed && !isEmpty(parsed)) {
        // Merge parsed into process.env so other code can read it normally
        for (const [k, v] of Object.entries(parsed)) {
          if (process.env[k] === undefined) {
            process.env[k] = String(v);
          }
        }
        // Consumer inspection for runtime ENV_JSON_KEYS (require/parse files)
        // has been intentionally removed. ENV_JSON_KEYS will be read only
        // from the parsed dotenv (process.env.ENV_JSON_KEYS) and will not
        // be discovered by inspecting consumer files or declaration files.
      }
    } catch (e) {
      console.warn("Failed to load dotenv dynamically:", e);
    }
  } else {
    console.debug("No .env file found near project; relying on process.env");
    // Build a curated environment object from process.env excluding common
    // platform variables which would otherwise pollute the returned env.
    const base = buildBaseEnv({ excludePlatform: true });
    envCache = {
      ...base,
      SERVER_PORT: base.SERVER_PORT || process.env.SERVER_PORT || "3001",
      CLIENT_URL: base.CLIENT_URL || process.env.CLIENT_URL || "",
      EXPRESS_SECRET_KEY:
        base.EXPRESS_SECRET_KEY ||
        process.env.EXPRESS_SECRET_KEY ||
        computeProjectFallbackKey(),
      FILE_HANDLER: base.FILE_HANDLER || process.env.FILE_HANDLER || "local",
    };
  }

  // Build final envCache from process.env but always exclude noisy
  // platform variables via buildBaseEnv so callers never observe them.
  const baseAll = buildBaseEnv({ excludePlatform: true });
  envCache = {
    ...baseAll,
    SERVER_PORT: baseAll.SERVER_PORT || process.env.SERVER_PORT || "3001",
    CLIENT_URL: baseAll.CLIENT_URL || process.env.CLIENT_URL || "",
    EXPRESS_SECRET_KEY:
      baseAll.EXPRESS_SECRET_KEY ||
      process.env.EXPRESS_SECRET_KEY ||
      computeProjectFallbackKey(),
    FILE_HANDLER: baseAll.FILE_HANDLER || process.env.FILE_HANDLER || "local",
  };

  // If ENV_JSON_KEYS was declared in dotenv (CSV), parse those listed
  // environment values from JSON strings into objects for envCache. We only
  // mutate the in-memory envCache and do not overwrite process.env so other
  // code that expects string values continues to work. Parsing errors are
  // ignored to avoid breaking startup.
  try {
    // Read ENV_JSON_KEYS only from the parsed dotenv (process.env). The
    // value is expected to be CSV: ENV_JSON_KEYS=KEY1, KEY2
    let keys: string[] | undefined = undefined;
    if (typeof process.env.ENV_JSON_KEYS === "string") {
      keys = String(process.env.ENV_JSON_KEYS)
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (Array.isArray(keys) && keys.length > 0) {
      for (const k of keys) {
        try {
          const raw = envCache[k];
          if (typeof raw === "string" && raw.trim()) {
            try {
              envCache[k] = JSON.parse(raw);
            } catch (e) {
              // Not valid JSON; leave as string
              try {
                maybeDebug(`Failed to parse JSON for ${k}:`, String(e));
              } catch (__) {
                // ignore
              }
            }
          }
        } catch (e) {
          // ignore per-key parse failures
        }
      }
    }
  } catch (e) {
    // ignore global parse orchestration failures
  }

  // Attempt to coerce boolean-typed keys declared in a consumer d.ts to
  // runtime booleans. This is a best-effort feature: we parse the d.ts and
  // look for keys declared as `boolean` in the ProcessEnv interface.
  try {
    // Build a list of candidate d.ts files to inspect: cwd, parent, and the
    // directory containing any discovered .env file. This ensures consumer
    // declaration files in sibling test-consumer folders are found.
    const dtsCandidates: string[] = [
      path.resolve(process.cwd(), "process-env.d.ts"),
      path.resolve(process.cwd(), "environment.d.ts"),
      path.resolve(process.cwd(), "env.config.d.ts"),
      path.resolve(process.cwd(), "..", "process-env.d.ts"),
      path.resolve(process.cwd(), "..", "environment.d.ts"),
      path.resolve(process.cwd(), "..", "env.config.d.ts"),
    ];
    try {
      if (envPath) {
        const envDir = path.dirname(envPath);
        dtsCandidates.push(path.resolve(envDir, "process-env.d.ts"));
        dtsCandidates.push(path.resolve(envDir, "environment.d.ts"));
        dtsCandidates.push(path.resolve(envDir, "env.config.d.ts"));
      }
    } catch (__) {
      // ignore
    }

    const boolKeysSet = new Set<string>();
    const boolRe = /([A-Za-z0-9_]+)\s*:\s*boolean\s*;/g;
    for (const dtsPath of dtsCandidates) {
      try {
        if (!fs.existsSync(dtsPath)) {
          continue;
        }
        const txt = fs.readFileSync(dtsPath, "utf8");
        let m: RegExpExecArray | null;
        while ((m = boolRe.exec(txt))) {
          if (m[1]) {
            boolKeysSet.add(m[1]);
          }
        }
      } catch (e) {
        // ignore per-file failures
      }
    }

    const boolKeys = Array.from(boolKeysSet);
    for (const k of boolKeys) {
      try {
        const v = envCache[k];
        if (typeof v === "string") {
          const low = v.toLowerCase().trim();
          if (low === "true" || low === "1") {
            envCache[k] = true;
          } else if (low === "false" || low === "0") {
            envCache[k] = false;
          }
        }
      } catch (e) {
        // ignore per-key coercion failures
      }
    }
  } catch (e) {
    // ignore d.ts boolean parsing failures
  }

  console.log(
    "[ENV DEBUG] Final env processing - about to inject into optionsManager",
  );
  console.log("[ENV DEBUG] optionsManager available:", !!optionsManager);
  console.log(
    "[ENV DEBUG] envCache keys:",
    envCache ? Object.keys(envCache).length : "null",
  );

  // Inject the computed environment into the global options under the
  // `ENV` key so consumers can inspect it via optionsManager.getOption('ENV')
  try {
    console.log("[ENV DEBUG] Starting ENV manager registration...");
    console.log("[ENV DEBUG] optionsManager available:", !!optionsManager);
    console.log(
      "[ENV DEBUG] setGlobalOptions available:",
      typeof optionsManager?.setGlobalOptions,
    );

    if (
      optionsManager &&
      typeof optionsManager.setGlobalOptions === "function"
    ) {
      // Ensure an 'ENV' manager is registered so setGlobalOptions will
      // apply the values. Some consumers rely on optionsManager.getOption('ENV', key)
      // which only works if a manager exists for the 'ENV' utility.
      try {
        const existing =
          typeof optionsManager.getManager === "function"
            ? optionsManager.getManager("ENV")
            : undefined;

        console.log("[ENV DEBUG] Existing ENV manager found:", !!existing);

        if (!existing) {
          let envManagerRegistered = false;

          // Prefer a provided LocalOptionsManager constructor when available
          const LocalCtor = (optionsManager as any).__LocalOptionsManager;
          console.log("[ENV DEBUG] LocalCtor available:", typeof LocalCtor);
          if (typeof LocalCtor === "function") {
            try {
              const m = new LocalCtor("ENV", { ...(envCache || {}) });
              if (typeof optionsManager.registerManager === "function") {
                optionsManager.registerManager("ENV", m);
                envManagerRegistered = true;
                console.log(
                  "[ENV DEBUG] Successfully registered ENV manager using LocalOptionsManager",
                );
              }
            } catch (e) {
              console.log(
                "[ENV DEBUG] Failed to register ENV manager using LocalCtor:",
                e,
              );
            }
          }

          // As a last-resort, register a minimal manager that supports
          // the small API used by consumers (getOption, setOption, getOptions)
          if (!envManagerRegistered) {
            console.log("[ENV DEBUG] Attempting minimal manager registration");
            try {
              const minimal = {
                options: { ...(envCache || {}) },
                getOption(key?: string) {
                  if (key === undefined) return { ...this.options };
                  return this.options[key];
                },
                setOption(obj: Record<string, any>) {
                  for (const [k, v] of Object.entries(obj || {})) {
                    this.options[k] = v;
                  }
                },
                getOptions() {
                  return { ...this.options };
                },
              } as any;
              if (typeof optionsManager.registerManager === "function") {
                optionsManager.registerManager("ENV", minimal);
                envManagerRegistered = true;
                console.log(
                  "[ENV DEBUG] Successfully registered ENV manager using minimal implementation",
                );
              }
            } catch (e) {
              console.log(
                "[ENV DEBUG] Failed to register minimal ENV manager:",
                e,
              );
            }
          }

          if (!envManagerRegistered) {
            console.log(
              "[ENV DEBUG] WARNING: Failed to register ENV manager - getManager('ENV') will return undefined",
            );
          }
        } else {
          console.log(
            "[ENV DEBUG] ENV manager already exists, updating options",
          );
        }

        // Store the computed ENV under the global options as `ENV` so
        // consumers can read optionsManager.getOption('ENV') or the
        // unified global options.
        try {
          console.log("[ENV DEBUG] Setting global options...");
          optionsManager.setGlobalOptions({
            ENV: { ...envCache },
            __READONLY__: true,
          });
          console.log("[ENV DEBUG] Successfully set global ENV options");
        } catch (e) {
          console.log("[ENV DEBUG] Failed to set global ENV options:", e);
          try {
            console.warn("Failed to set global ENV options:", e);
          } catch (__) {
            // ignore
          }
        }
      } catch (e) {
        console.log("[ENV DEBUG] Registration error:", e);
        // ignore registration failures and continue
      }
    } else {
      console.log(
        "[ENV DEBUG] optionsManager or setGlobalOptions not available",
      );
    }
  } catch (e) {
    console.log("[ENV DEBUG] Top-level error:", e);
    // ignore failures to set global options
  }

  return envCache;
};

// Initialize the environment variables once
const env = loadEnvironmentVariables();

/**
 * Dynamically determine the client URL
 * @param {MaybeRequest} req
 * @returns {string} The client URL
 */
export const getClientUrl = (req: MaybeRequest) => {
  // Try to treat req as a request-like object if possible
  const r = (req as any) || {};
  // First try from environment variable (highest priority)
  if (env.CLIENT_URL) {
    return env.CLIENT_URL;
  }

  // Fallback 1: Determine from Origin or Referer header
  const origin = r?.headers?.origin;
  if (origin) {
    return origin;
  }

  const referer = r?.headers?.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Invalid URL in referer
    }
  }

  // Fallback 2: Use request information to determine URL
  const protocol = r && r.secure ? "https" : "http";
  const host = r?.headers?.host || "localhost";

  // Parse host to get hostname and port
  const [hostname, serverPort] = host.split(":");

  // Determine client port
  let clientPort;

  if (env.VITE_CLIENT_PORT) {
    clientPort = env.VITE_CLIENT_PORT;
  } else if (process.env.NODE_ENV === "development") {
    // Common development port patterns
    if (serverPort) {
      if (serverPort === "3001") {
        clientPort = "3000";
      } else if (serverPort === "8000") {
        clientPort = "3000";
      } else if (serverPort.includes("backend")) {
        clientPort = serverPort.replace("backend", "frontend");
      }
    }
  }

  // If we couldn't determine a separate client port, use the server port
  if (!clientPort) {
    clientPort = serverPort;
  }

  // Build the URL, including port only if it exists
  const res = clientPort
    ? `${protocol}://${hostname}:${clientPort}`
    : `${protocol}://${hostname}`;

  // Cache the computed CLIENT_URL
  env.CLIENT_URL = res;

  return res;
};

export default env;
