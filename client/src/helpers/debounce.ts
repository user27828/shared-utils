/**
 * Debounce utilities — shared-utils/client/helpers
 *
 * Lightweight, zero-dependency debounce hooks for React.
 *
 * Provides:
 * - {@link useDebouncedValue}    — debounces a reactive value
 * - {@link useDebouncedCallback} — debounces a callback function
 *
 * Design influences:
 * - TanStack Pacer LiteDebouncer: leading/trailing, cancel/flush pattern
 * - xnimorz/use-debounce: maxWait, equalityFn, isPending, flushOnExit
 *
 * Key design decisions:
 * - Zero external dependencies — pure React hooks + setTimeout
 * - Stable references via useRef — no unnecessary re-renders
 * - Automatic cleanup on unmount (cancel by default, flush if configured)
 * - Generic type safety — argument/return types are fully inferred
 * - Exported for consumer projects to avoid code duplication
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * Options for debounce hooks.
 */
export interface DebounceOptions {
  /**
   * Delay in milliseconds before executing.
   * @default 0
   */
  wait?: number;
  /**
   * Execute on the leading edge of the timeout (immediately on first call).
   * @default false
   */
  leading?: boolean;
  /**
   * Execute on the trailing edge of the timeout (after wait period).
   * @default true
   */
  trailing?: boolean;
  /**
   * Maximum time (ms) the function is allowed to be delayed before forced
   * invocation. Useful when continuous input would otherwise delay execution
   * indefinitely.  `undefined` means no cap.
   */
  maxWait?: number;
  /**
   * If `true`, pending work is flushed (executed) on unmount instead of
   * cancelled.  Useful when the debounced function has persistent
   * side-effects such as saving data.
   * @default false
   */
  flushOnUnmount?: boolean;
}

/**
 * Control handle returned by both debounce hooks.
 */
export interface DebounceControls {
  /** Cancel any pending execution and reset timers. */
  cancel: () => void;
  /** Immediately execute any pending invocation. */
  flush: () => void;
  /** Returns `true` when an execution is pending. */
  isPending: () => boolean;
}

/**
 * Options specific to {@link useDebouncedValue}.
 */
export interface DebouncedValueOptions<T> extends DebounceOptions {
  /**
   * Custom equality function to compare previous and next values.
   * When it returns `true` the debounce timer is **not** started.
   * @default Object.is
   */
  equalityFn?: (a: T, b: T) => boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────

/** Noop that serves as a default for optional callbacks. */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

// ─── useDebouncedCallback ─────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` together with imperative
 * {@link DebounceControls} (`cancel`, `flush`, `isPending`).
 *
 * The returned function is **referentially stable** — it will never change
 * across re-renders.  The latest version of `fn` is always called (captured
 * via ref), so there is no need to list it in dependency arrays.
 *
 * @example
 * ```tsx
 * const [debouncedSearch, controls] = useDebouncedCallback(
 *   (query: string) => fetchResults(query),
 *   { wait: 300 },
 * );
 *
 * <input onChange={e => debouncedSearch(e.target.value)} />
 * <button onClick={controls.cancel}>Cancel</button>
 * ```
 */
export function useDebouncedCallback<TArgs extends unknown[], TReturn = void>(
  fn: (...args: TArgs) => TReturn,
  options: DebounceOptions = {},
): [(...args: TArgs) => void, DebounceControls] {
  const {
    wait = 0,
    leading = false,
    trailing = true,
    maxWait,
    flushOnUnmount = false,
  } = options;

  // Always call the latest `fn` without needing it in deps.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // Mutable timing state — kept in a single ref object to avoid allocating
  // multiple refs and to co-locate related state.
  const state = useRef({
    timeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
    maxTimeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
    lastArgs: undefined as TArgs | undefined,
    canLeadingExecute: true,
    mounted: true,
  });

  // ── Internal helpers ──────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (state.current.timeoutId !== undefined) {
      clearTimeout(state.current.timeoutId);
      state.current.timeoutId = undefined;
    }
    if (state.current.maxTimeoutId !== undefined) {
      clearTimeout(state.current.maxTimeoutId);
      state.current.maxTimeoutId = undefined;
    }
  }, []);

  const execute = useCallback(() => {
    const args = state.current.lastArgs;
    if (args === undefined) {
      return;
    }
    clearTimers();
    state.current.lastArgs = undefined;
    state.current.canLeadingExecute = true;
    fnRef.current(...args);
  }, [clearTimers]);

  // ── Public controls ───────────────────────────────────────────────────

  const cancel = useCallback(() => {
    clearTimers();
    state.current.lastArgs = undefined;
    state.current.canLeadingExecute = true;
  }, [clearTimers]);

  const flush = useCallback(() => {
    if (state.current.lastArgs !== undefined) {
      execute();
    }
  }, [execute]);

  const isPending = useCallback((): boolean => {
    return state.current.lastArgs !== undefined;
  }, []);

  // ── The debounced function ────────────────────────────────────────────

  const debounced = useCallback(
    (...args: TArgs): void => {
      if (!state.current.mounted) {
        return;
      }

      state.current.lastArgs = args;

      // Leading edge execution
      if (leading && state.current.canLeadingExecute) {
        state.current.canLeadingExecute = false;
        fnRef.current(...args);
        // If trailing is disabled we still need the timeout to reset
        // canLeadingExecute, but we clear lastArgs so trailing won't fire.
        if (!trailing) {
          state.current.lastArgs = undefined;
        }
      }

      // Clear existing trailing timer and start a new one.
      if (state.current.timeoutId !== undefined) {
        clearTimeout(state.current.timeoutId);
      }

      state.current.timeoutId = setTimeout(() => {
        state.current.timeoutId = undefined;
        state.current.canLeadingExecute = true;

        if (trailing && state.current.lastArgs !== undefined) {
          execute();
        }
      }, wait);

      // maxWait: start the max-wait timer only once per burst.
      if (maxWait !== undefined && state.current.maxTimeoutId === undefined) {
        state.current.maxTimeoutId = setTimeout(() => {
          state.current.maxTimeoutId = undefined;
          if (state.current.lastArgs !== undefined) {
            execute();
          }
        }, maxWait);
      }
    },
    // These options are structural — changes to them should recreate the
    // debounced function.  `fn` is captured by ref so it is NOT a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wait, leading, trailing, maxWait, execute],
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    state.current.mounted = true;

    return () => {
      state.current.mounted = false;
      if (flushOnUnmount) {
        flush();
      } else {
        cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const controls: DebounceControls = useMemo(
    () => ({ cancel, flush, isPending }),
    [cancel, flush, isPending],
  );

  return [debounced, controls];
}

// ─── useDebouncedValue ────────────────────────────────────────────────────

/**
 * Debounces a reactive value.  Returns the debounced value and
 * imperative {@link DebounceControls}.
 *
 * The debounced value updates only after `wait` ms of inactivity on the
 * source value.  An optional `equalityFn` prevents unnecessary timer resets
 * when the value is semantically unchanged.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const [debouncedSearch, controls] = useDebouncedValue(search, { wait: 300 });
 *
 * // `debouncedSearch` updates 300 ms after the user stops typing.
 * useEffect(() => {
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebouncedValue<T>(
  value: T,
  options: DebouncedValueOptions<T> = {},
): [T, DebounceControls] {
  const { equalityFn = Object.is, ...debounceOpts } = options;

  const [debouncedValue, setDebouncedValue] = useState(value);

  // Keep a ref to the previous raw value so we can skip equal values
  // without resetting the timer.
  const prevValueRef = useRef(value);

  const [setValueDebounced, controls] = useDebouncedCallback((next: T) => {
    setDebouncedValue(next);
  }, debounceOpts);

  // When the source value changes, kick the debounce timer.
  // Skip if the new value is equal per `equalityFn`.
  if (!equalityFn(prevValueRef.current, value)) {
    prevValueRef.current = value;
    setValueDebounced(value);
  }

  // If leading is active and this is the very first render with a changed
  // value, the debounced value should reflect immediately.  The callback
  // above already called setDebouncedValue synchronously in the leading
  // branch, so the state is correct after the next commit.

  return [debouncedValue, controls];
}
