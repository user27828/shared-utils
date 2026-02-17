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
export declare const extractFmFileUids: (body: string) => string[];
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
export declare const reconcileFmLinks: (fmService: FmServiceCore, entityType: string, entityUid: string, currentFileUids: string[], linkedField?: string, createdBy?: string | null) => Promise<FmLinkReconcileResult>;
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
        row?: {
            content?: string;
            content_type?: string;
        } | null;
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
export declare const createCmsFmLinkTracker: (config: CmsFmLinkTrackerConfig) => CmsFmLinkTracker;
//# sourceMappingURL=linkTracker.d.ts.map