/**
 * Sentinel actions for mergeJson key operations.
 * Uses Symbol.for() for stable cross-module identity (unlike Symbol(),
 * Symbol.for() returns the same symbol for the same key globally).
 */
export declare const mergeJsonActions: {
    /** Set a value to this sentinel to remove the key from the merged result */
    remove: symbol;
};
export interface MergeJsonProps {
    oldData?: Record<string, any> | null;
    newData: Record<string, any>;
    /** If provided, reads existing JSON from localStorage and writes the merged result back */
    storageKey?: string;
}
/**
 * Synchronous deep-merge of JSON-serialisable objects.
 *
 * Modelled after `mergeJsonbData` in @user27828/db-supabase but without
 * async/DB capabilities.  Optionally reads from / writes to localStorage
 * when `storageKey` is provided (analogous to `tableConfig` in the original).
 *
 * Merge semantics:
 * - Objects: recursively merged
 * - Arrays: replaced (not concatenated)
 * - Primitives & null: replaced
 * - `mergeJsonActions.remove`: deletes the key from the result
 *
 * @example
 * // Pure merge
 * mergeJson({ oldData: { a: 1 }, newData: { b: 2 } }); // { a: 1, b: 2 }
 *
 * // localStorage round-trip
 * mergeJson({ storageKey: "notifications", newData: { jsj_welcome: 1 } });
 *
 * // Key removal
 * mergeJson({ oldData: { a: 1, b: 2 }, newData: { b: mergeJsonActions.remove } }); // { a: 1 }
 */
export declare const mergeJson: (params: MergeJsonProps) => Record<string, any>;
