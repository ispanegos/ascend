import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AthleteBodyAvatar, bodyDataState } from "@/components/body/AthleteBodyAvatar";

describe("AthleteBodyAvatar (UI architecture only)", () => {
  it("derives the data state from which inputs exist — no morphology maths", () => {
    expect(bodyDataState({})).toBe("no-data");
    expect(bodyDataState({ height_cm: 180, waist_cm: null })).toBe("partial");
    expect(bodyDataState({ height_cm: 180, weight_kg: 80, body_fat_percentage: 18 })).toBe("estimated");
  });

  it("always says it is an estimate, not a scan", () => {
    render(<AthleteBodyAvatar measurements={{ height_cm: 180 }} />);
    expect(screen.getByText(/not a body scan/)).toBeInTheDocument();
    expect(screen.getByText("Estimated · partial data")).toBeInTheDocument();
  });

  it("invites measurements when there are none", () => {
    render(<AthleteBodyAvatar measurements={{}} editHref="/profile/edit/measurements" />);
    expect(screen.getByText("No body data yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add measurements" })).toHaveAttribute("href", "/profile/edit/measurements");
  });
});
