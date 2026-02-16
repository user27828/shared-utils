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
import React from "react";
import type { FmApi } from "./FmApi.js";
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
export declare const FmClientProvider: React.FC<FmClientProviderProps>;
/**
 * Hook to consume the nearest FmApi from context.
 * Falls back to the module-level default FmClient if no provider is present.
 */
export declare const useFmApi: () => FmApi;
export default FmClientProvider;
//# sourceMappingURL=FmClientProvider.d.ts.map