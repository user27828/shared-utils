/**
 * FmClientProvider — React Context for FM API dependency injection.
 *
 * Provides an `FmApi` instance to all FM components in the subtree.
 * If no provider is present, components fall back to a module-level
 * default `FmClient()` instance (same pattern as useFmListFiles).
 *
 * Usage:
 *   <FmClientProvider client={myClient}>
 *     <FmMediaLibrary />
 *   </FmClientProvider>
 *
 * Or without provider (uses default FmClient with /api/fm base URL):
 *   <FmMediaLibrary />
 */
import React, { createContext, useContext } from "react";
import type { FmApi } from "./FmApi.js";
import { FmClient } from "./FmClient.js";

const FmApiContext = createContext<FmApi | null>(null);

/** Module-level default client, created lazily on first access. */
let _defaultClient: FmClient | null = null;
const getDefaultClient = (): FmClient => {
  if (!_defaultClient) {
    _defaultClient = new FmClient();
  }
  return _defaultClient;
};

/** Props for {@link FmClientProvider}. */
export interface FmClientProviderProps {
  /** The FmApi implementation to provide to descendants. */
  client: FmApi;
  children: React.ReactNode;
}

/**
 * Wrap a subtree to provide a specific FmApi instance to all
 * FM components (FmMediaLibrary, FmFilePicker, useFmListFiles, etc.).
 */
export const FmClientProvider: React.FC<FmClientProviderProps> = ({
  client,
  children,
}) => {
  return <FmApiContext.Provider value={client}>{children}</FmApiContext.Provider>;
};

/**
 * Hook to consume the nearest FmApi from context.
 * Falls back to the module-level default FmClient if no provider is present.
 */
export const useFmApi = (): FmApi => {
  const fromContext = useContext(FmApiContext);
  return fromContext || getDefaultClient();
};

export default FmClientProvider;
