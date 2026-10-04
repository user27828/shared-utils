/**
 * File Manager SDK and transport contracts without React hooks or UI.
 *
 * Import from `@user27828/shared-utils/fm/client/api` when a consumer only
 * needs to call the FM API.
 */
export { FmClient, FmClientError } from "./FmClient.js";
export type { FmClientConfig } from "./FmClient.js";
export type { FmReadUrlResult, FmDeleteResult, FmApi } from "./FmApi.js";
