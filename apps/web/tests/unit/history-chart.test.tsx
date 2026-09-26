import type { HistoryPoint } from "@ascend/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistoryChart } from "@/components/charts/HistoryChart";
import { TrendBadge } from "@/components/ui/TrendBadge";

const NOW = new Date("2026-10-30T12:00:00Z");
const p = (at: string, current: number | null, peak: number | null = null): HistoryPoint => ({
  at,
  current,
  peak,
  confidence: 0.68,
  engineVersion: "0.1.1",
});

describe("HistoryChart (ADR-042)", () => {
  it("plots exactly the stored snapshots — one dot each, no line for a single point", () => {
    const { container } = render(<HistoryChart label="Strength" points={[p("2026-10-20T10:00:00Z", 44)]} window="28d" now={NOW} />);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelector("polyline")).toBeNull();
    expect(screen.getByText(/1 snapshot in this period/)).toBeInTheDocument();
  });

  it("never adds points between snapshots", () => {
    const points = [p("2026-10-05T10:00:00Z", 40), p("2026-10-15T10:00:00Z", 42, 42), p("2026-10-25T10:00:00Z", 45, 45)];
    const { container } = render(<HistoryChart label="Strength" points={points} window="28d" now={NOW} />);
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(container.querySelector("polyline")!.getAttribute("points")!.trim().split(" ")).toHaveLength(3);
    expect(screen.getByText("Verified Peak")).toBeInTheDocument();
  });

  it("offers the same data as a table", () => {
    render(<HistoryChart label="Core" points={[p("2026-10-20T10:00:00Z", 51.4)]} window="7d" now={NOW} />);
    expect(screen.getByRole("table")).toHaveTextContent("51");
  });

  it("skips Unranked snapshots entirely", () => {
    const { container } = render(<HistoryChart label="Power" points={[p("2026-10-20T10:00:00Z", null)]} window="28d" now={NOW} />);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("TrendBadge", () => {
  it("says nothing for insufficient history unless asked", () => {
    const trend = { state: "insufficient_history", delta: null, observations: 1, rulesVersion: "trend-0.1" } as const;
    const { container } = render(<TrendBadge trend={trend} />);
    expect(container).toBeEmptyDOMElement();
    render(<TrendBadge trend={trend} showInsufficient />);
    expect(screen.getByText("Not enough history yet")).toBeInTheDocument();
  });

  it("names the direction in words, not colour alone", () => {
    render(<TrendBadge trend={{ state: "improving", delta: 3, observations: 3, rulesVersion: "trend-0.1" }} />);
    expect(screen.getByText(/Improving/)).toBeInTheDocument();
  });
});
