import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timer } from "@/features/spawn/test/Timer";

describe("assessment timer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("stopwatch reports elapsed wall-clock time when stopped", () => {
    const onStop = vi.fn();
    render(<Timer mode="stopwatch" seconds={60} storageKey="t1" onStop={onStop} label="Balance timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(12_300));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledWith(12.3);
  });

  it("stops by itself at the cap", () => {
    const onStop = vi.fn();
    render(<Timer mode="stopwatch" seconds={60} storageKey="t2" onStop={onStop} label="Balance timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(61_000));
    expect(onStop).toHaveBeenCalledWith(60);
  });

  it("survives a reload: a running countdown resumes from device storage", () => {
    const { unmount } = render(<Timer mode="countdown" seconds={360} storageKey="t3" label="Walk timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60_000));
    unmount();

    act(() => vi.advanceTimersByTime(30_000)); // app closed for 30 s
    render(<Timer mode="countdown" seconds={360} storageKey="t3" label="Walk timer" />);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText("4:30")).toBeInTheDocument();
  });
});
