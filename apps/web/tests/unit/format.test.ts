import { describe, expect, it } from "vitest";
import { formatDayHeading } from "@/lib/format";

describe("formatDayHeading (spec §61)", () => {
  it("formats as weekday, day and three-letter month", () => {
    expect(formatDayHeading(new Date("2026-09-25T12:00:00Z"), "UTC")).toBe("Friday, 25 Sep");
  });

  it("uses the given time zone near midnight", () => {
    const lateUtc = new Date("2026-09-25T23:30:00Z");
    expect(formatDayHeading(lateUtc, "UTC")).toBe("Friday, 25 Sep");
    expect(formatDayHeading(lateUtc, "Europe/Rome")).toBe("Saturday, 26 Sep");
  });
});
