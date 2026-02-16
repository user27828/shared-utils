/**
 * FM Connector Conformance Harness
 *
 * Framework-agnostic (Vitest, Jest, etc.) — called once per connector
 * implementation to verify contract compliance against the FmConnector
 * interface.
 *
 * Mirrors the CMS conformance harness pattern: a single
 * `runFmConnectorConformanceTests()` export that registers describe/it
 * blocks using either injected or global test-runner primitives.
 *
 * @example
 * ```ts
 * import { runFmConnectorConformanceTests } from "@user27828/shared-utils/fm/server";
 *
 * runFmConnectorConformanceTests({
 *   name: "Supabase",
 *   factory: async () => ({
 *     connector: new FmConnectorSupabase(supabaseClient),
 *   }),
 * });
 * ```
 */
import type { FmConnector } from "../FmConnector.js";
export interface FmConformanceConfig {
    /** Display name for the describe block. */
    name: string;
    /**
     * Factory that creates a fresh FmConnector instance.
     * Called once via beforeAll (not per-test). Same lifecycle as CMS
     * conformance.
     */
    factory: () => Promise<{
        connector: FmConnector;
    }>;
    /** Optional cleanup hook called via afterAll after the suite completes. */
    cleanup?: (connector: FmConnector) => Promise<void>;
    /** Owner user UID for test rows. Default: "test-user-001". */
    ownerUid?: string;
    /**
     * Custom test runner globals — defaults to globalThis.describe/it/expect.
     * Matches CMS conformance pattern for framework-agnostic usage.
     */
    describe?: Function;
    it?: Function;
    expect?: Function;
    beforeAll?: Function;
    afterAll?: Function;
}
/**
 * Register all FmConnector conformance tests for the given connector
 * implementation.
 *
 * The suite covers:
 *  - File CRUD (insert, get, update, delete)
 *  - File listing with owner/archived/search/pagination filters
 *  - Variant CRUD (insert, get, update, list, delete)
 *  - Link CRUD (create, count, delete, delete-by-field, list)
 */
export declare function runFmConnectorConformanceTests(config: FmConformanceConfig): void;
//# sourceMappingURL=fmConformance.d.ts.map