import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../hooks/useDebounce";

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 200));
    expect(result.current).toBe("hello");
  });

  it("updates the debounced value only after the delay elapses", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: "a", delay: 300 } },
      );
      expect(result.current).toBe("a");

      rerender({ value: "b", delay: 300 });
      // Still old value before timeout fires.
      expect(result.current).toBe("a");

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe("a");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe("b");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels the previous timer when value changes mid-flight", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: "a" } },
      );

      rerender({ value: "b" });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      rerender({ value: "c" });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      // Even though 800 ms passed total, the latest change reset the timer:
      // only 400 ms have passed since the last value change.
      expect(result.current).toBe("a");

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe("c");
    } finally {
      vi.useRealTimers();
    }
  });
});
