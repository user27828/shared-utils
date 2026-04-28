/**
 * Turnstile server-side verification helpers.
 */

import {
  OptionsManager,
  optionsManager as globalOptionsManager,
} from "../../../utils/index.js";
import type {
  GlobalTurnstileOptions,
  TurnstileServerOptions,
} from "./types.js";

const defaultServerOptions = {
  secretKey: "",
  apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  timeoutMs: 10000,
  expectedAction: undefined as string | undefined,
  expectedHostname: undefined as string | undefined,
  allowedOrigins: [] as string[],
  tokenFieldName: "cf-turnstile-response",
};

let turnstileServerManager: OptionsManager<typeof defaultServerOptions> | null =
  null;

/**
 * Initialize or get the server options manager
 * Integrates with the global optionsManager for unified configuration
 */
const getTurnstileServerManager = (): OptionsManager<
  typeof defaultServerOptions
> => {
  if (!turnstileServerManager) {
    turnstileServerManager = new OptionsManager(
      "turnstile-server",
      defaultServerOptions,
    );
    // Register with global options manager for cross-utility configuration
    globalOptionsManager.registerManager(
      "turnstile-server",
      turnstileServerManager,
    );
  }
  return turnstileServerManager;
};

/**
 * Get current server-side Turnstile options
 * This integrates with the global optionsManager, so you can use:
 * globalOptionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export const getTurnstileServerOptions = (): TurnstileServerOptions => {
  const manager = getTurnstileServerManager();
  return manager.getOptions();
};

/**
 * Set global options for turnstile server configuration
 * This allows the same API pattern: setGlobalOptions({ 'turnstile-server': { ... } })
 */
export const setGlobalOptions = (options: GlobalTurnstileOptions): void => {
  globalOptionsManager.setGlobalOptions(options);
};
