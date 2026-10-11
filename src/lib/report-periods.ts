import {
  reportDateRange,
  reportPeriodRange,
  storeDate,
  type ReportGrouping,
  type ReportRange,
} from "./store-reports";

/** Quick choices shared by the finance and website-traffic reports. */
export type ReportPreset =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "last30"
  | "year"
  | "all";
export type ReportSelection = ReportPreset | "custom";

export const reportPresets: { value: ReportPreset; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "last30", label: "30 ngày qua" },
  { value: "year", label: "Năm nay" },
  { value: "all", label: "Từ trước đến nay" },
];

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function utcDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}
function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date: string, days: number) {
  const next = utcDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return dateKey(next);
}
/** A calendar date such as 2026-02-30 is rejected rather than rolled over. */
export function isCalendarDate(value: string) {
  return isoDate.test(value) && dateKey(utcDate(value)) === value;
}

export function presetRange(now: Date, preset: ReportPreset): ReportRange {
  if (preset === "all") return { from: "", to: "" };
  if (preset === "last30") return reportDateRange(now, 30);
  return reportPeriodRange(now, preset);
}

/** The preset whose dates equal the range today, otherwise a custom range. */
export function matchPreset(
  range: ReportRange,
  now: Date,
  presets: readonly ReportPreset[] = reportPresets.map((item) => item.value),
): ReportSelection {
  return (
    presets.find((preset) => {
      const candidate = presetRange(now, preset);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? "custom"
  );
}

/** Inclusive number of calendar days, or null for an open-ended range. */
export function rangeDays(range: ReportRange) {
  if (!range.from || !range.to) return null;
  return (
    Math.round(
      (utcDate(range.to).getTime() - utcDate(range.from).getTime()) /
        86_400_000,
    ) + 1
  );
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
function shiftMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const clamped = Math.min(
    day,
    lastDayOfMonth(target.getUTCFullYear(), target.getUTCMonth()),
  );
  target.setUTCDate(clamped);
  return dateKey(target);
}

/**
 * The earlier period used for "tăng/giảm so với kỳ trước". Calendar presets
 * compare the same elapsed days (for example 1–11 Oct with 1–11 Sep), while a
 * rolling or custom range compares the same number of days immediately before.
 */
export function comparisonRange(
  range: ReportRange,
  selection: ReportSelection,
): ReportRange | null {
  if (!range.from || !range.to || range.from > range.to) return null;
  if (selection === "month")
    return { from: shiftMonths(range.from, -1), to: shiftMonths(range.to, -1) };
  if (selection === "year")
    return {
      from: shiftMonths(range.from, -12),
      to: shiftMonths(range.to, -12),
    };
  if (selection === "week")
    return { from: addDays(range.from, -7), to: addDays(range.to, -7) };
  const days = rangeDays(range)!;
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

export function comparisonLabel(selection: ReportSelection) {
  if (selection === "today") return "hôm qua";
  if (selection === "yesterday") return "hôm kia";
  if (selection === "week") return "cùng kỳ tuần trước";
  if (selection === "month") return "cùng kỳ tháng trước";
  if (selection === "year") return "cùng kỳ năm trước";
  if (selection === "last30") return "30 ngày trước đó";
  return "khoảng thời gian liền trước";
}

/** Sentence opener such as "Tháng này" or "Từ 01/10 đến 11/10/2026". */
export function periodPhrase(selection: ReportSelection, range: ReportRange) {
  if (selection === "last30") return "Trong 30 ngày qua";
  if (selection === "all") return "Từ trước đến nay";
  if (selection !== "custom")
    return reportPresets.find((item) => item.value === selection)!.label;
  if (range.from && range.from === range.to)
    return `Ngày ${formatDay(range.from)}`;
  return `Từ ${formatDay(range.from, range.from.slice(0, 4) !== range.to.slice(0, 4))} đến ${formatDay(range.to)}`;
}

/** Vietnamese calendar date: 11/10/2026, or 11/10 without the year. */
export function formatDay(date: string, withYear = true) {
  if (!isoDate.test(date)) return date;
  const [year, month, day] = date.split("-");
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function formatRange(range: ReportRange) {
  if (!range.from && !range.to) return "Toàn bộ thời gian";
  if (!range.from) return `Đến ${formatDay(range.to)}`;
  if (!range.to) return `Từ ${formatDay(range.from)}`;
  if (range.from === range.to) return formatDay(range.from);
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${formatDay(range.from, !sameYear)} – ${formatDay(range.to)}`;
}

const weekdays = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];
export function weekdayLabel(date: string) {
  return weekdays[utcDate(date).getUTCDay()];
}

/** Chart-friendly grouping: daily for about a month, weekly up to half a year. */
export function suggestedGrouping(
  range: ReportRange,
  firstDate?: string,
  now = new Date(),
): ReportGrouping {
  const days = rangeDays({
    from: range.from || firstDate || "",
    to: range.to || storeDate(now),
  });
  if (days === null || days <= 35) return "day";
  return days <= 190 ? "week" : "month";
}

/** Relative change; null when the earlier value is zero and a % is meaningless. */
export function percentChange(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

/** Parse ?from=&to= (or ?period=all) shared between the two report screens. */
export function parseReportRange(
  params: Record<string, string | string[] | undefined>,
  { allowAll = false }: { allowAll?: boolean } = {},
): ReportRange | null {
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  if (allowAll && value("period") === "all") return { from: "", to: "" };
  const from = value("from");
  const to = value("to");
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) return null;
  return { from, to };
}

export function reportRangeQuery(range: ReportRange) {
  if (!range.from && !range.to) return "?period=all";
  if (!isCalendarDate(range.from) || !isCalendarDate(range.to)) return "";
  return `?${new URLSearchParams({ from: range.from, to: range.to })}`;
}
