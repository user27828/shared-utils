/**
 * FM Link Tracker — automatic CMS ↔ FM file link management
 *
 * Scans CMS HTML/Markdown body content for FM content URLs, extracts
 * the referenced file UIDs, and reconciles `fm_file_links` rows so the
 * "Where used" section in the FM details pane stays accurate.
 *
 * ## URL patterns matched
 *
 * Both URL formats produced by {@link FmClient.getContentUrl} are
 * recognised, along with common public/media patterns:
 *
 * | Pattern | Example |
 * |---|---|
 * | Admin router | `/api/fm/files/<uid>/content` |
 * | Standalone content router | `/fm/<uid>`, `/media/<uid>` |
 * | With query params + variants | `…/<uid>?v=thumb&dl=1` |
 *
 * ## Usage
 *
 * ```ts
 * import { createCmsFmLinkTracker } from "@user27828/shared-utils/server/fm";
 *
 * const tracker = createCmsFmLinkTracker({ fmService });
 *
 * // Wire into CMS service config:
 * const cmsService = new CmsServiceCore({
 *   connector: cmsConnector,
 *   onAfterWrite: tracker.onAfterWrite,
 * });
 * ```
 */

import type { FmServiceCore } from "./FmServiceCore.js";
import type { FmFileLinkRow } from "../../../utils/src/fm/types.js";

// ── UID extraction ───────────────────────────────────────────────────────

/**
 * Nanoid default alphabet: `A-Za-z0-9_-`, default length 21.
 * We match 10–30 chars to be resilient to config changes while
 * avoiding false positives on short IDs.
 */
const NANOID_PATTERN = "[A-Za-z0-9_-]{10,30}";

/**
 * Patterns that reference an FM file UID in a URL path.
 *
 * 1. Admin router:  `/files/<uid>/content`
 * 2. HTML `src`/`href` attribute:  `src="/<base>/<uid>"` (end of path)
 * 3. Markdown image / link:  `![alt](/path/<uid>)` or `[text](/path/<uid>)`
 *
 * The patterns are intentionally broad enough to match any mount point
 * (e.g. `/api/fm/files/…`, `/fm/…`, `/media/…`) while requiring the
 * UID to sit right before `/content` or at the end of the path segment.
 */
const FM_UID_REGEXES: RegExp[] = [
  // Admin router: /files/<uid>/content
  new RegExp(`/files/(${NANOID_PATTERN})/content(?:[?#]|$|")`, "g"),
  // HTML: src="…/<uid>" or href="…/<uid>?v=thumb"
  new RegExp(
    `(?:src|href)=["'](?:[^"']*/)?(${NANOID_PATTERN})(?:\\?[^"']*)?["']`,
    "gi",
  ),
  // Markdown: ![alt](/path/<uid>) or [text](/path/<uid>?query)
  new RegExp(`\\]\\((?:[^)]*/)?(${NANOID_PATTERN})(?:\\?[^)]*)?\\)`, "gi"),
];

/**
 * Additional heuristic: match bare nanoid-shaped tokens that are NOT
 * part of an obvious non-FM URL.  Only used as a fallback and de-duped
 * against the URL-based matches.
 */

/**
 * Extract unique FM file UIDs referenced in a body string (HTML or Markdown).
 *
 * Scans for URL patterns produced by {@link FmClient.getContentUrl}.
 * Returns a deduplicated array of UID strings.
 *
 * @param body - The content body (HTML, Markdown, or plain text).
 * @returns Array of unique FM file UIDs found in the content.
 */
export const extractFmFileUids = (body: string): string[] => {
  if (!body) {
    return [];
  }

  const uids = new Set<string>();

  for (const regex of FM_UID_REGEXES) {
    // Reset lastIndex because the regex has the `g` flag
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body)) !== null) {
      const uid = match[1];
      if (uid) {
        uids.add(uid);
      }
    }
  }

  return Array.from(uids);
};

// ── Link reconciliation ─────────────────────────────────────────────────

/**
 * Result of a link reconciliation operation.
 */
export interface FmLinkReconcileResult {
  /** UIDs of files for which links were created. */
  created: string[];
  /** UIDs of files for which links were removed. */
  removed: string[];
}

/**
 * Synchronise `fm_file_links` for a given entity so they match the
 * set of FM file UIDs currently referenced in the entity's content.
 *
 * - Creates links for newly referenced files.
 * - Deletes links for files no longer referenced.
 * - Leaves existing, still-valid links untouched.
 *
 * @param fmService  - The FM service instance providing link CRUD.
 * @param entityType - Entity type string (e.g. `"cms"`).
 * @param entityUid  - Entity UID (the CMS post UID).
 * @param currentFileUids - File UIDs currently referenced in the content.
 * @param linkedField - Optional field name (default: `"body"`).
 * @param createdBy  - Optional user UID for attribution.
 * @returns Summary of created and removed links.
 */
export const reconcileFmLinks = async (
  fmService: FmServiceCore,
  entityType: string,
  entityUid: string,
  currentFileUids: string[],
  linkedField = "body",
  createdBy?: string | null,
): Promise<FmLinkReconcileResult> => {
  const existing: FmFileLinkRow[] = await fmService.listLinksForEntity(
    entityType,
    entityUid,
  );

  // Build lookup of existing links (keyed by file_uid)
  const existingByFileUid = new Map<string, FmFileLinkRow>();
  for (const link of existing) {
    // Only consider links for our target field
    if (link.linked_field === linkedField) {
      existingByFileUid.set(link.file_uid, link);
    }
  }

  const wantedSet = new Set(currentFileUids);
  const created: string[] = [];
  const removed: string[] = [];

  // Create links for newly referenced files
  for (const fileUid of wantedSet) {
    if (!existingByFileUid.has(fileUid)) {
      try {
        await fmService.createLink({
          file_uid: fileUid,
          linked_entity_type: entityType,
          linked_entity_uid: entityUid,
          linked_field: linkedField,
          ...(createdBy ? { created_by: createdBy } : {}),
        });
        created.push(fileUid);
      } catch {
        // Best-effort: file may have been deleted between scan and link
        // creation. Swallow the error.
      }
    }
  }

  // Remove links for files no longer referenced
  for (const [fileUid] of existingByFileUid) {
    if (!wantedSet.has(fileUid)) {
      try {
        await fmService.deleteLink({
          fileUid,
          linkedEntityType: entityType,
          linkedEntityUid: entityUid,
        });
        removed.push(fileUid);
      } catch {
        // Best-effort
      }
    }
  }

  return { created, removed };
};

// ── CMS integration factory ──────────────────────────────────────────────

/**
 * Configuration for {@link createCmsFmLinkTracker}.
 */
export interface CmsFmLinkTrackerConfig {
  /** The FM service instance. */
  fmService: FmServiceCore;
  /**
   * Entity type string stored in `fm_file_links.linked_entity_type`.
   * Default: `"cms"`.
   */
  entityType?: string;
  /**
   * Field name stored in `fm_file_links.linked_field`.
   * Default: `"body"`.
   */
  linkedField?: string;
}

/**
 * Return value of {@link createCmsFmLinkTracker}.
 */
export interface CmsFmLinkTracker {
  /**
   * CMS `onAfterWrite` callback — pass this to
   * `CmsServiceCoreConfig.onAfterWrite`.
   */
  onAfterWrite: (event: {
    type: string;
    uid: string;
    row?: { content?: string; content_type?: string } | null;
    actorUserUid?: string | null;
  }) => Promise<void>;

  /**
   * Standalone extraction helper (for testing / one-off use).
   */
  extractFmFileUids: typeof extractFmFileUids;

  /**
   * Standalone reconciliation (for programmatic use).
   */
  reconcileFmLinks: typeof reconcileFmLinks;
}

/**
 * Create a CMS → FM link tracker that automatically maintains
 * `fm_file_links` rows whenever CMS content is written.
 *
 * The returned `onAfterWrite` callback should be wired to
 * `CmsServiceCoreConfig.onAfterWrite`:
 *
 * ```ts
 * const tracker = createCmsFmLinkTracker({ fmService });
 * const cmsService = new CmsServiceCore({
 *   connector,
 *   onAfterWrite: tracker.onAfterWrite,
 * });
 * ```
 *
 * ## Behaviour per event type
 *
 * | Event | Action |
 * |---|---|
 * | `create`, `update`, `publish`, `history_restore` | Scan body → reconcile links |
 * | `trash` | No action (links preserved for restore) |
 * | `restore` | Scan body → reconcile links |
 * | `delete` | Remove all links for the entity |
 *
 * @param config - Tracker configuration.
 * @returns An object with the `onAfterWrite` callback and standalone helpers.
 */
export const createCmsFmLinkTracker = (
  config: CmsFmLinkTrackerConfig,
): CmsFmLinkTracker => {
  const { fmService, entityType = "cms", linkedField = "body" } = config;

  const onAfterWrite = async (event: {
    type: string;
    uid: string;
    row?: { content?: string; content_type?: string } | null;
    actorUserUid?: string | null;
  }): Promise<void> => {
    const { type, uid, row, actorUserUid } = event;

    // On permanent delete: remove all links for this entity
    if (type === "delete") {
      await fmService.deleteLinksForEntity(entityType, uid);
      return;
    }

    // On trash: preserve links (they protect files from deletion)
    if (type === "trash") {
      return;
    }

    // For content-bearing events: scan and reconcile
    const contentEvents = new Set([
      "create",
      "update",
      "publish",
      "restore",
      "history_restore",
    ]);
    if (!contentEvents.has(type)) {
      return;
    }

    const body = row?.content;
    if (!body) {
      return;
    }

    // Only scan HTML and Markdown content (JSON/text unlikely to
    // contain FM URLs in a meaningful img/src context)
    const ct = row?.content_type || "";
    if (ct && ct !== "text/html" && ct !== "text/markdown") {
      return;
    }

    const fileUids = extractFmFileUids(body);
    await reconcileFmLinks(
      fmService,
      entityType,
      uid,
      fileUids,
      linkedField,
      actorUserUid,
    );
  };

  return {
    onAfterWrite,
    extractFmFileUids,
    reconcileFmLinks,
  };
};
