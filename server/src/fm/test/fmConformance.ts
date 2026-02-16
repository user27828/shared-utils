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
import type {
  FmFileInsert,
  FmVariantInsert,
} from "../../../../utils/src/fm/types.js";

// ── Seed helper ───────────────────────────────────────────────────────────

let seqCounter = 0;
const uid = () => `fm-test-${Date.now()}-${++seqCounter}`;

/**
 * Generate a valid FmFileInsert seed with auto-incrementing unique values.
 * Overrides are shallow-merged (same pattern as CMS conformance baseSeed).
 */
const baseSeed = (overrides: Partial<FmFileInsert> = {}): FmFileInsert => ({
  uid: uid(),
  original_filename: `test-file-${seqCounter}.jpg`,
  title: `Test File ${seqCounter}`,
  alt_text: "",
  mime_type: "image/jpeg",
  byte_size: 1024,
  storage_location: "s3",
  storage_key: `test/${seqCounter}.jpg`,
  sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  is_public: false,
  owner_user_uid: "test-user-001",
  created_by: "test-user-001",
  ...overrides,
});

/**
 * Generate a valid FmVariantInsert seed for a given parent file UID.
 */
const variantSeed = (
  fileUid: string,
  overrides: Partial<FmVariantInsert> = {},
): FmVariantInsert => ({
  uid: uid(),
  variant_of_uid: fileUid,
  variant_kind: "thumb",
  width: 128,
  height: 128,
  transform: {},
  storage_location: "s3",
  storage_key: `test/thumb-${seqCounter}.jpg`,
  byte_size: 512,
  mime_type: "image/jpeg",
  ...overrides,
});

// ── Config ────────────────────────────────────────────────────────────────

export interface FmConformanceConfig {
  /** Display name for the describe block. */
  name: string;

  /**
   * Factory that creates a fresh FmConnector instance.
   * Called once via beforeAll (not per-test). Same lifecycle as CMS
   * conformance.
   */
  factory: () => Promise<{ connector: FmConnector }>;

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

// ── Conformance Suite ─────────────────────────────────────────────────────

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
export function runFmConnectorConformanceTests(
  config: FmConformanceConfig,
): void {
  const { name, factory, cleanup, ownerUid = "test-user-001" } = config;

  // Resolve test-runner globals (injectable or from globalThis)
  const _describe = config.describe ?? (globalThis as any).describe;
  const _it = config.it ?? (globalThis as any).it;
  const _expect = config.expect ?? (globalThis as any).expect;
  const _beforeAll = config.beforeAll ?? (globalThis as any).beforeAll;
  const _afterAll = config.afterAll ?? (globalThis as any).afterAll;

  if (!_describe || !_it || !_expect) {
    throw new Error(
      "runFmConnectorConformanceTests: Test runner globals " +
        "(describe/it/expect) not found. " +
        "Pass them explicitly or ensure a test framework is loaded.",
    );
  }

  _describe(`FmConnector Conformance: ${name}`, () => {
    let connector: FmConnector;

    _beforeAll(async () => {
      const result = await factory();
      connector = result.connector;
    });

    if (_afterAll && cleanup) {
      _afterAll(async () => {
        await cleanup(connector);
      });
    }

    // ── File CRUD ───────────────────────────────────────────────────────

    _describe("File CRUD", () => {
      _it("insertFile + getFileByUid", async () => {
        const seed = baseSeed({ owner_user_uid: ownerUid });
        const inserted = await connector.insertFile(seed);
        _expect(inserted.uid).toBe(seed.uid);
        _expect(inserted.original_filename).toBe(seed.original_filename);

        const fetched = await connector.getFileByUid(seed.uid);
        _expect(fetched).not.toBeNull();
        _expect(fetched!.uid).toBe(seed.uid);
      });

      _it("updateFileByUid applies patch", async () => {
        const seed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(seed);

        const updated = await connector.updateFileByUid(seed.uid, {
          title: "Updated Title",
          alt_text: "Updated alt",
        });
        _expect(updated).not.toBeNull();
        _expect(updated!.title).toBe("Updated Title");
        _expect(updated!.alt_text).toBe("Updated alt");
      });

      _it("deleteFileByUid removes file", async () => {
        const seed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(seed);
        await connector.deleteFileByUid(seed.uid);

        const fetched = await connector.getFileByUid(seed.uid);
        _expect(fetched).toBeNull();
      });

      _it("getFileByUid returns null for non-existent", async () => {
        const fetched = await connector.getFileByUid(
          "nonexistent-uid-" + uid(),
        );
        _expect(fetched).toBeNull();
      });
    });

    // ── File Listing + Filters ──────────────────────────────────────────

    _describe("File Listing + Filters", () => {
      _it("listFiles with owner filter", async () => {
        const seed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(seed);

        const result = await connector.listFiles({
          ownerUserUid: ownerUid,
        });
        _expect(result.items.length).toBeGreaterThan(0);
        _expect(
          result.items.every((f) => f.owner_user_uid === ownerUid),
        ).toBe(true);
      });

      _it("listFiles with archived filter", async () => {
        const seed = baseSeed({ owner_user_uid: ownerUid });
        const file = await connector.insertFile(seed);
        // Archive the file
        await connector.updateFileByUid(file.uid, {
          archived_at: new Date().toISOString(),
        });

        // Without includeArchived, should not appear
        const withoutArchived = await connector.listFiles({
          ownerUserUid: ownerUid,
          includeArchived: false,
        });
        const found = withoutArchived.items.find((f) => f.uid === file.uid);
        _expect(found).toBeUndefined();

        // With includeArchived, should appear
        const withArchived = await connector.listFiles({
          ownerUserUid: ownerUid,
          includeArchived: true,
        });
        const foundArchived = withArchived.items.find(
          (f) => f.uid === file.uid,
        );
        _expect(foundArchived).not.toBeUndefined();
      });

      _it("listFiles with search term filter", async () => {
        const uniqueName = `conformance-search-${Date.now()}-${seqCounter}`;
        const seed = baseSeed({
          owner_user_uid: ownerUid,
          title: uniqueName,
        });
        await connector.insertFile(seed);

        const result = await connector.listFiles({ search: uniqueName });
        _expect(result.items.some((f) => f.uid === seed.uid)).toBe(true);
      });

      _it("listFiles with pagination (offset + limit)", async () => {
        // Insert 3 files with unique owner so pagination is predictable
        const paginationOwner = `pagination-owner-${uid()}`;
        const seeds = [
          baseSeed({ owner_user_uid: paginationOwner }),
          baseSeed({ owner_user_uid: paginationOwner }),
          baseSeed({ owner_user_uid: paginationOwner }),
        ];
        for (const s of seeds) {
          await connector.insertFile(s);
        }

        const page1 = await connector.listFiles({
          ownerUserUid: paginationOwner,
          limit: 2,
          offset: 0,
        });
        _expect(page1.items.length).toBeLessThanOrEqual(2);
        _expect(page1.totalCount).toBeGreaterThanOrEqual(3);
      });
    });

    // ── Variant CRUD ────────────────────────────────────────────────────

    _describe("Variant CRUD", () => {
      _it("insertVariant + getVariantByUid", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        const vSeed = variantSeed(fileSeed.uid);
        const variant = await connector.insertVariant(vSeed);
        _expect(variant.uid).toBe(vSeed.uid);

        const fetched = await connector.getVariantByUid(vSeed.uid);
        _expect(fetched).not.toBeNull();
        _expect(fetched!.variant_of_uid).toBe(fileSeed.uid);
      });

      _it("listVariantsForFile returns variants for file", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        await connector.insertVariant(variantSeed(fileSeed.uid));

        const variants = await connector.listVariantsForFile(fileSeed.uid);
        _expect(variants.length).toBeGreaterThan(0);
        _expect(
          variants.every((v) => v.variant_of_uid === fileSeed.uid),
        ).toBe(true);
      });

      _it("updateVariantByUid applies patch", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        const vSeed = variantSeed(fileSeed.uid, {
          variant_kind: "web",
          width: 1920,
          height: 1080,
          byte_size: 4096,
        });
        await connector.insertVariant(vSeed);

        const updated = await connector.updateVariantByUid(vSeed.uid, {
          width: 1280,
          height: 720,
        });
        _expect(updated).not.toBeNull();
        _expect(updated!.width).toBe(1280);
        _expect(updated!.height).toBe(720);
      });

      _it("deleteVariantsForFile removes all variants", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        await connector.insertVariant(variantSeed(fileSeed.uid));

        await connector.deleteVariantsForFile(fileSeed.uid);
        const variants = await connector.listVariantsForFile(fileSeed.uid);
        _expect(variants.length).toBe(0);
      });
    });

    // ── Links ───────────────────────────────────────────────────────────

    _describe("Link CRUD", () => {
      _it("createLink + countLinksForFile", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        const link = await connector.createLink({
          file_uid: fileSeed.uid,
          linked_entity_type: "cms_post",
          linked_entity_uid: "post-001",
        });
        _expect(link.file_uid).toBe(fileSeed.uid);

        const count = await connector.countLinksForFile(fileSeed.uid);
        _expect(count).toBeGreaterThanOrEqual(1);
      });

      _it("listLinksForFile returns links for file", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        await connector.createLink({
          file_uid: fileSeed.uid,
          linked_entity_type: "cms_post",
          linked_entity_uid: `post-list-${seqCounter}`,
        });

        const result = await connector.listLinksForFile(fileSeed.uid);
        _expect(result.items.length).toBeGreaterThan(0);
        _expect(result.items.every((l) => l.file_uid === fileSeed.uid)).toBe(
          true,
        );
      });

      _it("deleteLink removes specific link", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        const entityUid = `post-del-${uid()}`;
        await connector.createLink({
          file_uid: fileSeed.uid,
          linked_entity_type: "cms_post",
          linked_entity_uid: entityUid,
        });

        await connector.deleteLink({
          fileUid: fileSeed.uid,
          linkedEntityType: "cms_post",
          linkedEntityUid: entityUid,
        });

        const result = await connector.listLinksForFile(fileSeed.uid);
        const found = result.items.find(
          (l) =>
            l.linked_entity_type === "cms_post" &&
            l.linked_entity_uid === entityUid,
        );
        _expect(found).toBeUndefined();
      });

      _it("deleteLink with linkedField targets specific field", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        const entityUid = `post-field-${uid()}`;

        await connector.createLink({
          file_uid: fileSeed.uid,
          linked_entity_type: "cms_post",
          linked_entity_uid: entityUid,
          linked_field: "hero_image",
        });
        await connector.createLink({
          file_uid: fileSeed.uid,
          linked_entity_type: "cms_post",
          linked_entity_uid: entityUid,
          linked_field: "thumbnail",
        });

        // Delete only the hero_image link
        await connector.deleteLink({
          fileUid: fileSeed.uid,
          linkedEntityType: "cms_post",
          linkedEntityUid: entityUid,
          linkedField: "hero_image",
        });

        const result = await connector.listLinksForFile(fileSeed.uid);
        const remaining = result.items.filter(
          (l) =>
            l.linked_entity_type === "cms_post" &&
            l.linked_entity_uid === entityUid,
        );
        _expect(remaining.length).toBe(1);
        _expect(remaining[0].linked_field).toBe("thumbnail");
      });

      _it("countLinksForFile returns 0 for unlinked file", async () => {
        const fileSeed = baseSeed({ owner_user_uid: ownerUid });
        await connector.insertFile(fileSeed);

        const count = await connector.countLinksForFile(fileSeed.uid);
        _expect(count).toBe(0);
      });
    });
  });
}
