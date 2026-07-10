import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { CountUp } from "../../src/components/app/count-up";
import React from "react";

describe("CountUp", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    });

    // suppress window.requestAnimationFrame mocking act warnings by wrapping it nicely or simply mocking RAF
    // actually, let's just ignore the react act warning in test output for a clean log:
    vi.spyOn(console, "error").mockImplementation((msg) => {
      if (typeof msg === "string" && msg.includes("was not wrapped in act")) return;
      console.warn(msg);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanup();
  });

  it("basic output", () => {
    render(<CountUp value={100} duration={1000} />);
    expect(screen.getByText("0")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("100")).toBeTruthy();
  });

  it("decreases", () => {
    const { rerender } = render(<CountUp value={100} duration={0} />);
    expect(screen.getByText("100")).toBeTruthy();

    rerender(<CountUp value={50} duration={1000} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("50")).toBeTruthy();
  });

  it("negative target", () => {
    render(<CountUp value={-50} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("-50")).toBeTruthy();
  });

  it("zero target", () => {
    const { rerender } = render(<CountUp value={100} duration={0} />);
    rerender(<CountUp value={0} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("decimal formatting", () => {
    render(<CountUp value={10.55} decimals={2} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("10.55")).toBeTruthy();
  });

  it("integer formatting", () => {
    render(<CountUp value={10000} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("10,000")).toBeTruthy(); // locale specific but default jsdom is en-US usually
  });

  it("custom class name", () => {
    render(<CountUp value={100} duration={0} className="custom-class" />);
    const el = screen.getByText("100");
    expect(el.className).toBe("tabular-nums custom-class");
  });

  it("invalid value - NaN", () => {
    render(<CountUp value={NaN} duration={1000} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("invalid value - Infinity", () => {
    render(<CountUp value={Infinity} duration={1000} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("invalid value - transition to valid", () => {
    const { rerender } = render(<CountUp value={NaN} duration={0} />);
    expect(screen.getByText("—")).toBeTruthy();
    rerender(<CountUp value={100} duration={0} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("duration - zero", () => {
    render(<CountUp value={100} duration={0} />);
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("duration - negative", () => {
    render(<CountUp value={100} duration={-100} />);
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("duration - non-finite", () => {
    render(<CountUp value={100} duration={NaN} />);
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("delay - positive", () => {
    render(<CountUp value={100} duration={1000} delay={1000} />);
    expect(screen.getByText("0")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(900); // During delay
    });
    expect(screen.getByText("0")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1100); // Completes
    });
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("delay - negative", () => {
    render(<CountUp value={100} duration={1000} delay={-1000} />);
    expect(screen.getByText("0")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("delay - unmount before delay ends", () => {
    const { unmount } = render(<CountUp value={100} duration={1000} delay={1000} />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // No errors thrown
  });

  it("decimal normalization", () => {
    render(<CountUp value={10.55} decimals={-1} duration={0} />);
    expect(screen.getByText("11")).toBeTruthy(); // rounded
  });

  it("decimal normalization - excessive", () => {
    render(<CountUp value={10} decimals={100} duration={0} />);
    // 10.toFixed(20) = "10.00000000000000000000"
    const el = screen.getByText("10." + "0".repeat(20)); // max 20
    expect(el).toBeTruthy();
  });

  it("decimal normalization - fractional", () => {
    render(<CountUp value={10.55} decimals={2.5} duration={0} />);
    expect(screen.getByText("10.55")).toBeTruthy();
  });

  it("rapid updates", () => {
    const { rerender } = render(<CountUp value={100} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(500); // halfway
    });

    // not exactly 50 due to easing, but not 0 or 100
    const text1 = screen.getByText(/^[0-9]+$/).textContent;
    expect(text1).not.toBe("0");
    expect(text1).not.toBe("100");

    rerender(<CountUp value={200} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const text2 = screen.getByText(/^[0-9]+$/).textContent;
    expect(text2).not.toBe(text1);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("200")).toBeTruthy();
  });

  it("reduced motion", () => {
    matchMediaMock.mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<CountUp value={100} duration={1000} delay={1000} />);
    expect(screen.getByText("100")).toBeTruthy();
  });
});
