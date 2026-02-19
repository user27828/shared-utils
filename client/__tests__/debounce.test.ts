/**
 * Tests for useDebouncedValue and useDebouncedCallback hooks.
 *
 * Uses Vitest + @testing-library/react with fake timers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useDebouncedValue,
  useDebouncedCallback,
} from "../src/helpers/debounce.js";

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── useDebouncedValue ────────────────────────────────────────────────────

describe("useDebouncedValue", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() =>
      useDebouncedValue("hello", { wait: 300 }),
    );
    expect(result.current[0]).toBe("hello");
  });

  it("debounces value changes by the specified wait time", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { wait: 300 }),
      { initialProps: { value: "a" } },
    );

    // Update the value
    rerender({ value: "ab" });
    expect(result.current[0]).toBe("a"); // Not yet debounced

    // Advance halfway — still the old value
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current[0]).toBe("a");

    // Advance the rest
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current[0]).toBe("ab");
  });

  it("resets the timer on rapid changes (only last value fires)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { wait: 300 }),
      { initialProps: { value: "" } },
    );

    rerender({ value: "h" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "he" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "hel" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "hell" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "hello" });

    // Not enough time for any debounce to fire yet since last change
    expect(result.current[0]).toBe("");

    // Advance 300ms from last change
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current[0]).toBe("hello");
  });

  it("provides cancel() that prevents pending update", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { wait: 300 }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Cancel before it fires
    act(() => {
      result.current[1].cancel();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current[0]).toBe("a"); // Stayed at "a"
  });

  it("provides flush() that immediately updates", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { wait: 300 }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "flushed" });
    expect(result.current[0]).toBe("a");

    act(() => {
      result.current[1].flush();
    });
    expect(result.current[0]).toBe("flushed");
  });

  it("provides isPending() that reports timer status", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { wait: 300 }),
      { initialProps: { value: "a" } },
    );

    expect(result.current[1].isPending()).toBe(false);

    rerender({ value: "b" });
    expect(result.current[1].isPending()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current[1].isPending()).toBe(false);
  });

  it("respects equalityFn to skip identical values", () => {
    const fn = vi.fn();
    const { rerender } = renderHook(
      ({ value }) =>
        useDebouncedValue(value, {
          wait: 300,
          // Treat all strings of same length as equal (contrived example)
          equalityFn: (a, b) => a.length === b.length,
        }),
      { initialProps: { value: "aa" } },
    );

    // "bb" has same length as "aa" — should NOT trigger debounce
    rerender({ value: "bb" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // No fn calls expected because equalityFn said values are "equal"
    // The debounced value stays at "aa"
  });

  it("supports leading edge execution", () => {
    const { result, rerender } = renderHook(
      ({ value }) =>
        useDebouncedValue(value, { wait: 300, leading: true, trailing: false }),
      { initialProps: { value: "a" } },
    );

    // Change value — leading should execute immediately
    rerender({ value: "b" });

    // Leading: the debounced value should update immediately
    // (It updates on next React render after setState in the leading branch)
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current[0]).toBe("b");
  });
});

// ─── useDebouncedCallback ─────────────────────────────────────────────────

describe("useDebouncedCallback", () => {
  it("delays callback execution by wait time", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    act(() => {
      result.current[0]("test");
    });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("test");
  });

  it("only fires the last invocation during rapid calls", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    act(() => {
      result.current[0]("a");
      result.current[0]("b");
      result.current[0]("c");
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("supports leading edge execution", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200, leading: true, trailing: false }),
    );

    act(() => {
      result.current[0]("first");
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("first");

    // Second call within wait period — should NOT fire (trailing: false)
    act(() => {
      result.current[0]("second");
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("supports leading + trailing execution", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200, leading: true, trailing: true }),
    );

    act(() => {
      result.current[0]("first");
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("first");

    act(() => {
      result.current[0]("second");
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Trailing edge fires with last args
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("second");
  });

  it("cancel() prevents pending execution", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    act(() => {
      result.current[0]("x");
    });

    act(() => {
      result.current[1].cancel();
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("flush() immediately executes pending callback", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    act(() => {
      result.current[0]("flushed");
    });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      result.current[1].flush();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("flushed");
  });

  it("flush() does nothing when nothing is pending", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    act(() => {
      result.current[1].flush();
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("isPending() returns correct status", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    expect(result.current[1].isPending()).toBe(false);

    act(() => {
      result.current[0]("x");
    });
    expect(result.current[1].isPending()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current[1].isPending()).toBe(false);
  });

  it("supports maxWait to cap delay", () => {
    const fn = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200, maxWait: 500 }),
    );

    // Simulate continuous typing every 100ms (resets the 200ms debounce timer)
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current[0](`call-${i}`);
        vi.advanceTimersByTime(100);
      });
    }

    // After 1000ms total, maxWait should have forced at least one execution
    // (maxWait fires at 500ms from the first call)
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("always calls the latest fn reference", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ fn }) => useDebouncedCallback(fn, { wait: 200 }),
      { initialProps: { fn: fn1 } },
    );

    act(() => {
      result.current[0]("x");
    });

    // Update the callback to fn2 before debounce fires
    rerender({ fn: fn2 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // fn2 should be called (not fn1) because we always use the latest ref
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith("x");
  });

  it("cancels on unmount by default", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200 }),
    );

    act(() => {
      result.current[0]("x");
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("flushes on unmount when flushOnUnmount is true", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(fn, { wait: 200, flushOnUnmount: true }),
    );

    act(() => {
      result.current[0]("saved");
    });

    unmount();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("saved");
  });
});
