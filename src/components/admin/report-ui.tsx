"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Info,
  Minus,
  TriangleAlert,
} from "lucide-react";
import {
  formatRange,
  rangeDays,
  reportPresets,
  reportRangeQuery,
  type ReportPreset,
  type ReportSelection,
} from "@/lib/report-periods";
import type { ReportRange } from "@/lib/store-reports";
import { fieldClass, panelClass } from "./admin-common";

const percentFormat = new Intl.NumberFormat("vi-VN", {
  style: "percent",
  maximumFractionDigits: 1,
});
const countFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});
const compactFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

/** 0.047 → "4,7%" (Vietnamese decimal comma, used on both report screens). */
export function formatPercent(value: number) {
  return percentFormat.format(Number.isFinite(value) ? value : 0);
}
export function formatCount(value: number) {
  return countFormat.format(Number.isFinite(value) ? value : 0);
}
/** Axis-friendly money: 1500000 → "1,5 triệu", 250000 → "250 nghìn". */
export function formatCompactMoney(value: number) {
  const size = Math.abs(value);
  if (size >= 1e9) return `${compactFormat.format(value / 1e9)} tỷ`;
  if (size >= 1e6) return `${compactFormat.format(value / 1e6)} triệu`;
  if (size >= 1e3) return `${compactFormat.format(value / 1e3)} nghìn`;
  return compactFormat.format(value);
}

/** Round axis steps (1, 2, 2.5, 5 × 10ⁿ) covering zero, min and max. */
export function niceTicks(
  min: number,
  max: number,
  target = 4,
  integer = false,
) {
  const low = Math.min(0, min);
  const high = Math.max(low + (integer ? target : 1), max);
  const raw = (high - low) / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step =
    (integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10])
      .map((factor) => factor * power)
      .find((candidate) => candidate >= raw && (!integer || candidate >= 1)) ??
    10 * power;
  const start = Math.floor(low / step) * step;
  const end = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step)
    ticks.push(Math.round(value * 1e6) / 1e6);
  return ticks;
}

/** Render SVG charts at the container's real width instead of scrolling. */
export function useElementWidth(
  ref: RefObject<HTMLElement | null>,
  fallback = 720,
) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () =>
      setWidth(Math.max(280, Math.round(element.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function ReportModules({
  traffic = false,
  range,
}: {
  traffic?: boolean;
  range?: ReportRange;
}) {
  const query = range ? reportRangeQuery(range) : "";
  const tabs = [
    {
      href: "/admin/analytics",
      active: !traffic,
      title: "Báo cáo tài chính",
      note: "Doanh thu, lãi, tiền thu",
    },
    {
      href: "/admin/analytics/traffic",
      active: traffic,
      title: "Lưu lượng website",
      note: "Người ghé thăm, nguồn khách",
    },
  ];
  return (
    <nav aria-label="Loại báo cáo" className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={`${tab.href}${tab.href === "/admin/analytics/traffic" && query === "?period=all" ? "" : query}`}
          aria-current={tab.active ? "page" : undefined}
          className={`min-w-0 flex-1 rounded-xl px-4 py-3 text-sm font-medium sm:flex-none ${tab.active ? "bg-[#294836] text-white" : "border border-[#dce3d7] bg-white hover:bg-[#f2f5ee]"}`}
        >
          {tab.title}
          <span
            className={`mt-0.5 block text-xs font-normal ${tab.active ? "text-white/75" : "text-[#6b7867]"}`}
          >
            {tab.note}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function PeriodPicker({
  range,
  selection,
  presets,
  onPreset,
  onCustom,
  comparison,
  actions,
  children,
}: {
  range: ReportRange;
  selection: ReportSelection;
  presets: ReportPreset[];
  onPreset: (preset: ReportPreset) => void;
  onCustom: (range: ReportRange) => void;
  comparison?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const [customOpen, setCustomOpen] = useState(selection === "custom");
  const showCustom = customOpen || selection === "custom";
  const days = rangeDays(range);
  const chip = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${active ? "border-[#294836] bg-[#294836] text-white" : "border-[#d4dcce] bg-white text-[#294836] hover:bg-[#eef3e7]"}`;
  return (
    <section
      aria-labelledby="report-period-title"
      className="rounded-2xl border border-[#dfe5d8] bg-white p-4 shadow-sm sm:p-5"
    >
      <h2
        id="report-period-title"
        className="text-xs font-semibold tracking-[0.12em] text-[#6b7867] uppercase"
      >
        Xem số liệu trong
      </h2>
      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Chọn nhanh khoảng thời gian"
      >
        {reportPresets
          .filter((preset) => presets.includes(preset.value))
          .map((preset) => (
            <button
              key={preset.value}
              type="button"
              aria-pressed={selection === preset.value}
              className={chip(selection === preset.value)}
              onClick={() => {
                setCustomOpen(false);
                onPreset(preset.value);
              }}
            >
              {preset.label}
            </button>
          ))}
        <button
          type="button"
          aria-pressed={selection === "custom"}
          aria-expanded={showCustom}
          className={chip(selection === "custom")}
          onClick={() =>
            setCustomOpen((open) => !open || selection === "custom")
          }
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          Chọn ngày
        </button>
      </div>
      {showCustom && (
        <div className="mt-4 grid gap-3 rounded-xl bg-[#f4f6f0] p-3 sm:grid-cols-2">
          <label className="text-xs text-[#6b7867]">
            Từ ngày
            <input
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(event) =>
                onCustom({ ...range, from: event.target.value })
              }
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="text-xs text-[#6b7867]">
            Đến ngày
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(event) =>
                onCustom({ ...range, to: event.target.value })
              }
              className={`${fieldClass} mt-1`}
            />
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0e7] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm leading-6 text-[#4f5d4b]" aria-live="polite">
          Đang xem{" "}
          <strong className="font-semibold text-[#21372b]">
            {formatRange(range)}
          </strong>
          {days && days > 0 ? ` · ${days} ngày` : ""}
          {comparison ? (
            <span className="block text-xs text-[#6b7867]">{comparison}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-[#d4dcce] bg-[#f4f6f0] p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-md px-3 text-xs font-medium sm:text-sm ${value === option.value ? "bg-white text-[#21372b] shadow-sm" : "text-[#6b7867] hover:text-[#21372b]"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DeltaBadge({
  change,
  label,
}: {
  change: number | null;
  label: string;
}) {
  if (change === null)
    return (
      <p className="mt-3 text-xs text-[#6b7867]">
        Kỳ trước chưa có số liệu để so sánh
      </p>
    );
  const direction = change > 0.0005 ? "up" : change < -0.0005 ? "down" : "flat";
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#6b7867]">
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${direction === "up" ? "bg-[#e5f1dc] text-[#2f6a1f]" : direction === "down" ? "bg-[#fbe9e4] text-[#a2402c]" : "bg-[#eef0ea] text-[#55624f]"}`}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {direction === "up" ? "Tăng " : direction === "down" ? "Giảm " : ""}
        {direction === "flat" ? "Không đổi" : formatPercent(Math.abs(change))}
      </span>
      <span>so với {label}</span>
    </p>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  footer,
  muted = false,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  delta?: ReactNode;
  footer?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={`${panelClass} flex flex-col`}>
      <p className="text-sm font-medium text-[#4f5d4b]">{label}</p>
      <p
        className={`mt-2 break-words font-semibold tracking-tight ${muted ? "text-lg text-[#6b7867]" : "text-2xl text-[#21372b] sm:text-[1.7rem]"}`}
      >
        {value}
      </p>
      {delta}
      <p className="mt-3 text-xs leading-5 text-[#6b7867]">{hint}</p>
      {footer}
    </div>
  );
}

export function SmallStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#e4e9de] bg-white/80 p-4">
      <p className="text-xs font-medium text-[#4f5d4b]">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-[#21372b]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#6b7867]">{hint}</p>
    </div>
  );
}

export function ReportSection({
  title,
  question,
  actions,
  children,
  className = "",
}: {
  title: string;
  question?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${panelClass} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {question && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b7867]">
              {question}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  role,
}: {
  tone?: "info" | "warning";
  title?: string;
  children: ReactNode;
  role?: "status" | "alert";
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      role={role}
      className={`flex gap-3 rounded-xl p-4 text-sm leading-6 ${tone === "warning" ? "bg-amber-50 text-amber-950" : "bg-[#eef3e7] text-[#2f4433]"}`}
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${tone === "warning" ? "text-amber-700" : "text-[#557a3d]"}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function MoreDetails({
  summary,
  children,
  className = "",
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`group rounded-xl border border-[#e4e9de] ${className}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-[#294836] [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-[#e4e9de] px-4 py-4">{children}</div>
    </details>
  );
}

/** Horizontal share bar list used for sources, devices and products. */
export function BarList({
  rows,
  valueLabel,
  max,
}: {
  rows: {
    key: string;
    label: ReactNode;
    sublabel?: ReactNode;
    value: number;
    display: ReactNode;
  }[];
  valueLabel: string;
  max?: number;
}) {
  const largest = max ?? Math.max(1, ...rows.map((row) => row.value));
  return (
    <ol className="space-y-3.5" aria-label={valueLabel}>
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="font-medium text-[#21372b]">{row.label}</span>
              {row.sublabel && (
                <span className="block text-xs [overflow-wrap:anywhere] text-[#7a8574]">
                  {row.sublabel}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right text-sm text-[#21372b]">
              {row.display}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#edf1e7]">
            <div
              className="h-full rounded-full bg-[#5f8a45]"
              style={{
                width: `${Math.max(row.value > 0 ? 1.5 : 0, (Math.max(0, row.value) / largest) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
