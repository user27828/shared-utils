/**
 * Sentinel actions for mergeJson key operations.
 * Uses Symbol.for() for stable cross-module identity (unlike Symbol(),
 * Symbol.for() returns the same symbol for the same key globally).
 */
export const mergeJsonActions = {
  /** Set a value to this sentinel to remove the key from the merged result */
  remove: Symbol.for("shared-utils.mergeJson.REMOVE"),
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
export const mergeJson = (params: MergeJsonProps): Record<string, any> => {
  let { oldData, newData, storageKey } = params;

  // If storageKey provided and oldData not given, read from localStorage
  if (storageKey && oldData == null) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(storageKey);
        oldData = stored ? JSON.parse(stored) : {};
      } catch {
        oldData = {};
      }
    } else {
      oldData = {};
    }
  }

  oldData = oldData || {};

  const merged: Record<string, any> = { ...oldData };

  for (const [key, value] of Object.entries(newData)) {
    // Sentinel: remove key
    if (value === mergeJsonActions.remove) {
      delete merged[key];
      continue;
    }

    // Recurse into plain objects
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      merged[key] = mergeJson({
        oldData:
          typeof merged[key] === "object" &&
          merged[key] !== null &&
          !Array.isArray(merged[key])
            ? merged[key]
            : {},
        newData: value,
      });
    } else {
      // Primitives, null, arrays: overwrite
      merged[key] = value;
    }
  }

  // Write back to localStorage if storageKey was provided
  if (storageKey && typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch {
      // Silently handle storage quota errors
    }
  }

  return merged;
};
