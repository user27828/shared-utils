/**
 * CMS Connector Conformance Test Harness — shared-utils
 *
 * A reusable test suite that exercises all CmsConnector interface methods
 * against any adapter implementation.  The host app calls
 * `runCmsConnectorConformanceTests()` from within its own Vitest/Jest
 * test runner, passing a factory that creates a fresh connector + seed data.
 *
 * Usage in a consuming project:
 *
 *   import { runCmsConnectorConformanceTests } from "@user27828/shared-utils/server/cms";
 *   import { createSupabaseConnector } from "./mySupabaseConnector";
 *
 *   runCmsConnectorConformanceTests({
 *     name: "SupabaseCmsConnector",
 *     factory: async () => {
 *       const connector = createSupabaseConnector(testClient);
 *       return { connector };
 *     },
 *     cleanup: async (connector) => { ... },
 *   });
 */
import type { CmsConnector } from "./connector.js";
export interface ConformanceTestConfig {
    /** Display name for the describe block. */
    name: string;
    /**
     * Factory that creates a fresh CmsConnector instance before each test
     * (or before the suite, depending on isolation needs).
     */
    factory: () => Promise<{
        connector: CmsConnector;
    }>;
    /**
     * Optional cleanup hook called after the suite completes.
     */
    cleanup?: (connector: CmsConnector) => Promise<void>;
    /**
     * Owner user UID to use in test rows.  Default: "test-user-001".
     */
    ownerUid?: string;
    /**
     * Custom test runner — defaults to globalThis.describe/it/expect.
     * Set these if your test framework uses different globals.
     */
    describe?: Function;
    it?: Function;
    expect?: Function;
    beforeAll?: Function;
    afterAll?: Function;
}
export declare function runCmsConnectorConformanceTests(config: ConformanceTestConfig): void;
//# sourceMappingURL=conformance.d.ts.map