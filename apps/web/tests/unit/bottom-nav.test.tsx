import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/shell/BottomNav";
import { NAV_ITEMS, isActiveHref, isActiveItem } from "@/components/shell/nav-items";

const pathname = vi.hoisted(() => ({ current: "/today" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("BottomNav (Design System V2 §4)", () => {
  beforeEach(() => {
    pathname.current = "/today";
  });

  it("has at most five destinations in the specified order", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["Today", "Quests", "Ascend", "Stats", "You"]);
  });

  it("puts ASCEND in the centre as the primary destination", () => {
    expect(NAV_ITEMS[2]).toMatchObject({ label: "Ascend", primary: true });
    expect(NAV_ITEMS.filter((item) => item.primary)).toHaveLength(1);
  });

  it("is a labelled navigation landmark with named links", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
  });

  it("marks exactly one destination as the current page", () => {
    pathname.current = "/stats/endurance";
    render(<BottomNav />);
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Stats");
  });
});

describe("isActiveHref", () => {
  it("matches the route and nested routes only", () => {
    expect(isActiveHref("/bosses", "/bosses")).toBe(true);
    expect(isActiveHref("/bosses/the-marathon", "/bosses")).toBe(true);
    expect(isActiveHref("/bossesx", "/bosses")).toBe(false);
  });
});

describe("isActiveItem", () => {
  it("keeps Boss encounters inside Ascend", () => {
    const ascend = NAV_ITEMS.find((item) => item.label === "Ascend")!;
    expect(isActiveItem("/bosses", ascend)).toBe(true);
    expect(NAV_ITEMS.some((item) => item.label === "Bosses")).toBe(false);
  });
});
