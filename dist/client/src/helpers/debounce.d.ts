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
export declare function useDebouncedCallback<TArgs extends unknown[], TReturn = void>(fn: (...args: TArgs) => TReturn, options?: DebounceOptions): [(...args: TArgs) => void, DebounceControls];
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
export declare function useDebouncedValue<T>(value: T, options?: DebouncedValueOptions<T>): [T, DebounceControls];
//# sourceMappingURL=debounce.d.ts.map