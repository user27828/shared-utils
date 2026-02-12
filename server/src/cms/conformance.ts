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
import type { CmsHeadRow, CmsHistoryRow } from "../../../utils/src/cms/types.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ConformanceTestConfig {
  /** Display name for the describe block. */
  name: string;

  /**
   * Factory that creates a fresh CmsConnector instance before each test
   * (or before the suite, depending on isolation needs).
   */
  factory: () => Promise<{ connector: CmsConnector }>;

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

// ─── Seed helpers ─────────────────────────────────────────────────────────

let seqCounter = 0;
const uid = () => `conf-test-${Date.now()}-${++seqCounter}`;

const baseSeed = (overrides: Partial<CmsHeadRow> = {}): Partial<CmsHeadRow> => ({
  uid: uid(),
  slug: `test-slug-${seqCounter}`,
  title: `Test Title ${seqCounter}`,
  body: "<p>Test body content</p>",
  locale: "en",
  post_type: "page",
  content_type: "text/html",
  status: "draft",
  version_number: 1,
  etag: `cms:test:v1`,
  owner_user_uid: "test-user-001",
  ...overrides,
});

// ─── Conformance Suite ────────────────────────────────────────────────────

export function runCmsConnectorConformanceTests(config: ConformanceTestConfig): void {
  const {
    name,
    factory,
    cleanup,
    ownerUid = "test-user-001",
  } = config;

  // Use globalThis test functions if not provided
  const _describe = config.describe ?? (globalThis as any).describe;
  const _it = config.it ?? (globalThis as any).it;
  const _expect = config.expect ?? (globalThis as any).expect;
  const _beforeAll = config.beforeAll ?? (globalThis as any).beforeAll;
  const _afterAll = config.afterAll ?? (globalThis as any).afterAll;

  if (!_describe || !_it || !_expect) {
    throw new Error(
      "runCmsConnectorConformanceTests: Test runner globals (describe/it/expect) not found. " +
        "Pass them explicitly or ensure a test framework is loaded.",
    );
  }

  _describe(`CmsConnector Conformance: ${name}`, () => {
    let connector: CmsConnector;

    _beforeAll(async () => {
      const result = await factory();
      connector = result.connector;
    });

    if (_afterAll && cleanup) {
      _afterAll(async () => {
        await cleanup(connector);
      });
    }

    // ──────────────────────────────────────────────────────────────────
    //  insert + getByUid
    // ──────────────────────────────────────────────────────────────────
    _it("should insert a row and retrieve it by UID", async () => {
      const seed = baseSeed({ owner_user_uid: ownerUid });
      const inserted = await connector.insert(seed as CmsHeadRow);

      _expect(inserted).toBeTruthy();
      _expect(inserted.uid).toBe(seed.uid);
      _expect(inserted.title).toBe(seed.title);

      const fetched = await connector.getByUid(seed.uid!);
      _expect(fetched).toBeTruthy();
      _expect(fetched!.uid).toBe(seed.uid);
      _expect(fetched!.slug).toBe(seed.slug);
    });

    // ──────────────────────────────────────────────────────────────────
    //  updateByUid
    // ──────────────────────────────────────────────────────────────────
    _it("should update a row by UID", async () => {
      const seed = baseSeed({ owner_user_uid: ownerUid });
      await connector.insert(seed as CmsHeadRow);

      const updated = await connector.updateByUid(seed.uid!, {
        title: "Updated Title",
        version_number: 2,
        etag: "cms:test:v2",
      });

      _expect(updated).toBeTruthy();
      _expect(updated!.title).toBe("Updated Title");
      _expect(updated!.version_number).toBe(2);

      const refetched = await connector.getByUid(seed.uid!);
      _expect(refetched!.title).toBe("Updated Title");
    });

    // ──────────────────────────────────────────────────────────────────
    //  deleteByUid
    // ──────────────────────────────────────────────────────────────────
    _it("should delete a row by UID", async () => {
      const seed = baseSeed({ owner_user_uid: ownerUid });
      await connector.insert(seed as CmsHeadRow);

      await connector.deleteByUid(seed.uid!);

      const gone = await connector.getByUid(seed.uid!);
      _expect(gone).toBeFalsy();
    });

    // ──────────────────────────────────────────────────────────────────
    //  list with filters
    // ──────────────────────────────────────────────────────────────────
    _it("should list rows with status filter", async () => {
      const uid1 = uid();
      const uid2 = uid();
      await connector.insert(baseSeed({
        uid: uid1,
        slug: `list-draft-${uid1}`,
        status: "draft",
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);
      await connector.insert(baseSeed({
        uid: uid2,
        slug: `list-pub-${uid2}`,
        status: "published",
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      const drafts = await connector.list({
        status: "draft",
        limit: 100,
        offset: 0,
      });

      _expect(drafts).toBeTruthy();
      _expect(drafts.items).toBeDefined();
      // All returned items should be 'draft'
      for (const item of drafts.items) {
        _expect(item.status).toBe("draft");
      }
    });

    // ──────────────────────────────────────────────────────────────────
    //  list with pagination
    // ──────────────────────────────────────────────────────────────────
    _it("should respect limit and offset in list", async () => {
      // Insert enough items
      for (let i = 0; i < 3; i++) {
        const id = uid();
        await connector.insert(baseSeed({
          uid: id,
          slug: `page-${id}`,
          status: "draft",
          owner_user_uid: ownerUid,
        }) as CmsHeadRow);
      }

      const page1 = await connector.list({ limit: 2, offset: 0 });
      _expect(page1.items.length).toBeLessThanOrEqual(2);

      const page2 = await connector.list({ limit: 2, offset: 2 });
      _expect(page2.items).toBeDefined();
    });

    // ──────────────────────────────────────────────────────────────────
    //  getPublishedBySlug
    // ──────────────────────────────────────────────────────────────────
    _it("should fetch a published entry by slug triple", async () => {
      const id = uid();
      await connector.insert(baseSeed({
        uid: id,
        slug: `pub-${id}`,
        status: "published",
        published_at: new Date().toISOString(),
        locale: "en",
        post_type: "page",
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      const result = await connector.getPublishedBySlug({
        postType: "page",
        locale: "en",
        slug: `pub-${id}`,
      });

      _expect(result).toBeTruthy();
      _expect(result!.uid).toBe(id);
    });

    _it("should return null for a non-existent slug", async () => {
      const result = await connector.getPublishedBySlug({
        postType: "page",
        locale: "en",
        slug: "nonexistent-slug-" + Date.now(),
      });
      _expect(result).toBeFalsy();
    });

    // ──────────────────────────────────────────────────────────────────
    //  History: insertHistory + listHistory
    // ──────────────────────────────────────────────────────────────────
    _it("should insert and list history entries", async () => {
      const id = uid();
      await connector.insert(baseSeed({
        uid: id,
        slug: `hist-${id}`,
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      // Insert a history snapshot
      const histRow = await connector.insertHistory({
        cms_uid: id,
        version: 1,
        title: "Original Title",
        body: "<p>Original</p>",
        slug: `hist-${id}`,
        locale: "en",
        content_type: "text/html",
        post_type: "page",
        status: "draft",
        changed_by: ownerUid,
        change_type: "update",
      } as any);

      _expect(histRow).toBeTruthy();
      _expect(histRow.id).toBeDefined();

      const histList = await connector.listHistory({
        cmsUid: id,
        limit: 50,
        offset: 0,
      });

      _expect(histList).toBeTruthy();
      // Should contain at least the one we inserted
      const items = histList.items ?? histList;
      _expect(Array.isArray(items)).toBe(true);
      _expect(items.length).toBeGreaterThanOrEqual(1);
    });

    // ──────────────────────────────────────────────────────────────────
    //  History: getHistoryById
    // ──────────────────────────────────────────────────────────────────
    _it("should get a single history entry by ID", async () => {
      const id = uid();
      await connector.insert(baseSeed({
        uid: id,
        slug: `histget-${id}`,
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      const histRow = await connector.insertHistory({
        cms_uid: id,
        version: 1,
        title: "Snapshot",
        body: "body",
        slug: `histget-${id}`,
        locale: "en",
        content_type: "text/html",
        post_type: "page",
        status: "draft",
        changed_by: ownerUid,
        change_type: "update",
      } as any);

      const fetched = await connector.getHistoryById(histRow.id!);
      _expect(fetched).toBeTruthy();
      _expect(fetched!.id).toBe(histRow.id);
    });

    // ──────────────────────────────────────────────────────────────────
    //  History: updateHistoryById (soft-delete)
    // ──────────────────────────────────────────────────────────────────
    _it("should update a history entry (soft-delete)", async () => {
      const id = uid();
      await connector.insert(baseSeed({
        uid: id,
        slug: `histup-${id}`,
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      const histRow = await connector.insertHistory({
        cms_uid: id,
        version: 1,
        title: "To soft-delete",
        body: "body",
        slug: `histup-${id}`,
        locale: "en",
        content_type: "text/html",
        post_type: "page",
        status: "draft",
        changed_by: ownerUid,
        change_type: "update",
      } as any);

      const updated = await connector.updateHistoryById(histRow.id!, {
        soft_deleted_at: new Date().toISOString(),
      });

      _expect(updated).toBeTruthy();
      _expect((updated as any).is_deleted).toBe(true);
    });

    // ──────────────────────────────────────────────────────────────────
    //  History: deleteHistoryById (hard-delete)
    // ──────────────────────────────────────────────────────────────────
    _it("should hard-delete a history entry", async () => {
      const id = uid();
      await connector.insert(baseSeed({
        uid: id,
        slug: `histdel-${id}`,
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      const histRow = await connector.insertHistory({
        cms_uid: id,
        version: 1,
        title: "To hard-delete",
        body: "body",
        slug: `histdel-${id}`,
        locale: "en",
        content_type: "text/html",
        post_type: "page",
        status: "draft",
        changed_by: ownerUid,
        change_type: "update",
      } as any);

      await connector.deleteHistoryById(histRow.id!);

      const gone = await connector.getHistoryById(histRow.id!);
      _expect(gone).toBeFalsy();
    });

    // ──────────────────────────────────────────────────────────────────
    //  Collaborators: list + replace
    // ──────────────────────────────────────────────────────────────────
    _it("should list and replace collaborators", async () => {
      const id = uid();
      await connector.insert(baseSeed({
        uid: id,
        slug: `collab-${id}`,
        owner_user_uid: ownerUid,
      }) as CmsHeadRow);

      // Start with empty
      const initial = await connector.listCollaborators(id);
      _expect(Array.isArray(initial)).toBe(true);

      // Replace with one collaborator
      const replaced = await connector.replaceCollaborators(id, [
        { user_uid: "collab-user-001", role: "author" },
      ]);

      _expect(Array.isArray(replaced)).toBe(true);
      _expect(replaced.length).toBeGreaterThanOrEqual(1);

      // Verify via list
      const afterReplace = await connector.listCollaborators(id);
      _expect(afterReplace.length).toBeGreaterThanOrEqual(1);

      // Clear all collaborators
      const cleared = await connector.replaceCollaborators(id, []);
      _expect(Array.isArray(cleared)).toBe(true);
    });
  });
}
