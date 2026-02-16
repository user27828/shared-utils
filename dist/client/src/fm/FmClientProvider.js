import { jsx as _jsx } from "react/jsx-runtime";
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
import { createContext, useContext } from "react";
import { FmClient } from "./FmClient.js";
const FmApiContext = createContext(null);
/** Module-level default client, created lazily on first access. */
let _defaultClient = null;
const getDefaultClient = () => {
    if (!_defaultClient) {
        _defaultClient = new FmClient();
    }
    return _defaultClient;
};
/**
 * Wrap a subtree to provide a specific FmApi instance to all
 * FM components (FmMediaLibrary, FmFilePicker, useFmListFiles, etc.).
 */
export const FmClientProvider = ({ client, children, }) => {
    return _jsx(FmApiContext.Provider, { value: client, children: children });
};
/**
 * Hook to consume the nearest FmApi from context.
 * Falls back to the module-level default FmClient if no provider is present.
 */
export const useFmApi = () => {
    const fromContext = useContext(FmApiContext);
    return fromContext || getDefaultClient();
};
export default FmClientProvider;
