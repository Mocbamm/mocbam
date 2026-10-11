import { describe, expect, it } from "vitest";
import {
  comparisonLabel,
  comparisonRange,
  formatDay,
  formatRange,
  isCalendarDate,
  matchPreset,
  parseReportRange,
  percentChange,
  periodPhrase,
  presetRange,
  rangeDays,
  reportRangeQuery,
  suggestedGrouping,
} from "@/lib/report-periods";

// Sunday 11 October 2026, 10:00 in Vietnam.
const now = new Date("2026-10-11T03:00:00Z");

describe("report presets", () => {
  it("builds Vietnam calendar ranges and recognises them again", () => {
    expect(presetRange(now, "today")).toEqual({
      from: "2026-10-11",
      to: "2026-10-11",
    });
    expect(presetRange(now, "week")).toEqual({
      from: "2026-10-05",
      to: "2026-10-11",
    });
    expect(presetRange(now, "last30")).toEqual({
      from: "2026-09-12",
      to: "2026-10-11",
    });
    expect(presetRange(now, "all")).toEqual({ from: "", to: "" });
    for (const preset of ["yesterday", "month", "last30", "year"] as const)
      expect(matchPreset(presetRange(now, preset), now)).toBe(preset);
    expect(matchPreset({ from: "2026-10-02", to: "2026-10-05" }, now)).toBe(
      "custom",
    );
    // Traffic has no open-ended range, so an empty range is custom/invalid there.
    expect(
      matchPreset({ from: "", to: "" }, now, ["today", "month", "last30"]),
    ).toBe("custom");
  });

  it("uses the next calendar day boundary in Vietnam rather than UTC", () => {
    const lateEvening = new Date("2026-10-11T17:30:00Z");
    expect(presetRange(lateEvening, "today").from).toBe("2026-10-12");
  });
});

describe("comparison periods", () => {
  it("compares calendar presets with the same elapsed days", () => {
    expect(
      comparisonRange({ from: "2026-10-01", to: "2026-10-11" }, "month"),
    ).toEqual({ from: "2026-09-01", to: "2026-09-11" });
    expect(
      comparisonRange({ from: "2026-03-01", to: "2026-03-31" }, "month"),
    ).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(
      comparisonRange({ from: "2028-01-01", to: "2028-02-29" }, "year"),
    ).toEqual({ from: "2027-01-01", to: "2027-02-28" });
    expect(
      comparisonRange({ from: "2026-10-05", to: "2026-10-11" }, "week"),
    ).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(
      comparisonRange({ from: "2026-10-11", to: "2026-10-11" }, "today"),
    ).toEqual({ from: "2026-10-10", to: "2026-10-10" });
  });

  it("compares rolling and custom ranges with the same number of days before", () => {
    expect(
      comparisonRange({ from: "2026-09-12", to: "2026-10-11" }, "last30"),
    ).toEqual({ from: "2026-08-13", to: "2026-09-11" });
    expect(
      comparisonRange({ from: "2026-10-01", to: "2026-10-10" }, "custom"),
    ).toEqual({ from: "2026-09-21", to: "2026-09-30" });
    expect(comparisonRange({ from: "", to: "" }, "all")).toBeNull();
    expect(
      comparisonRange({ from: "2026-10-10", to: "2026-10-01" }, "custom"),
    ).toBeNull();
    expect(comparisonLabel("month")).toBe("cùng kỳ tháng trước");
  });

  it("reports relative change only when the earlier value is meaningful", () => {
    expect(percentChange(120, 100)).toBeCloseTo(0.2);
    expect(percentChange(80, 100)).toBeCloseTo(-0.2);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(50, 0)).toBeNull();
    expect(percentChange(50, -100)).toBeCloseTo(1.5);
  });
});

describe("Vietnamese date wording", () => {
  it("formats days, ranges and sentence openers", () => {
    expect(formatDay("2026-10-05")).toBe("05/10/2026");
    expect(formatDay("2026-10-05", false)).toBe("05/10");
    expect(formatRange({ from: "2026-10-01", to: "2026-10-11" })).toBe(
      "01/10 – 11/10/2026",
    );
    expect(formatRange({ from: "2025-12-29", to: "2026-01-04" })).toBe(
      "29/12/2025 – 04/01/2026",
    );
    expect(formatRange({ from: "", to: "" })).toBe("Toàn bộ thời gian");
    expect(
      periodPhrase("month", { from: "2026-10-01", to: "2026-10-11" }),
    ).toBe("Tháng này");
    expect(
      periodPhrase("custom", { from: "2026-10-01", to: "2026-10-03" }),
    ).toBe("Từ 01/10 đến 03/10/2026");
    expect(
      periodPhrase("custom", { from: "2026-10-03", to: "2026-10-03" }),
    ).toBe("Ngày 03/10/2026");
    expect(rangeDays({ from: "2026-10-01", to: "2026-10-31" })).toBe(31);
    expect(rangeDays({ from: "", to: "" })).toBeNull();
  });

  it("chooses a readable chart grouping for the range length", () => {
    expect(suggestedGrouping({ from: "2026-10-01", to: "2026-10-31" })).toBe(
      "day",
    );
    expect(suggestedGrouping({ from: "2026-06-01", to: "2026-10-11" })).toBe(
      "week",
    );
    expect(suggestedGrouping({ from: "2026-01-01", to: "2026-10-11" })).toBe(
      "month",
    );
    expect(suggestedGrouping({ from: "", to: "" }, "2026-09-20", now)).toBe(
      "day",
    );
  });
});

describe("shared report links", () => {
  it("accepts only real, ordered calendar dates", () => {
    expect(parseReportRange({ from: "2026-10-01", to: "2026-10-11" })).toEqual({
      from: "2026-10-01",
      to: "2026-10-11",
    });
    expect(parseReportRange({ from: "2026-02-30", to: "2026-03-01" })).toBe(
      null,
    );
    expect(parseReportRange({ from: "2026-10-11", to: "2026-10-01" })).toBe(
      null,
    );
    expect(parseReportRange({ from: ["2026-10-01"], to: "2026-10-11" })).toBe(
      null,
    );
    expect(parseReportRange({ period: "all" })).toBeNull();
    expect(parseReportRange({ period: "all" }, { allowAll: true })).toEqual({
      from: "",
      to: "",
    });
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
  });

  it("round-trips the selected range through the report tabs", () => {
    const range = { from: "2026-10-01", to: "2026-10-11" };
    const query = reportRangeQuery(range);
    expect(query).toBe("?from=2026-10-01&to=2026-10-11");
    expect(
      parseReportRange(Object.fromEntries(new URLSearchParams(query))),
    ).toEqual(range);
    expect(reportRangeQuery({ from: "", to: "" })).toBe("?period=all");
  });
});
