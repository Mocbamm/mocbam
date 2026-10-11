"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { niceTicks, useElementWidth } from "./report-ui";

export type TimeSeries = {
  key: string;
  label: string;
  color: string;
  kind: "line" | "area" | "bar";
  values: (number | null)[];
};

/**
 * One-axis time chart that fits its container (no sideways scrolling), with a
 * readout above the plot. Pointer, tap and arrow keys choose the period shown;
 * by default the latest period is shown so the newest numbers are never hidden.
 */
export function TimeChart({
  title,
  description,
  axisLabels,
  series,
  axisFormat,
  integer = false,
  readout,
  pointTitle,
  unit,
  legend,
}: {
  title: string;
  description: string;
  axisLabels: string[];
  series: TimeSeries[];
  axisFormat: (value: number) => string;
  integer?: boolean;
  readout: (index: number) => ReactNode;
  pointTitle: (index: number) => string;
  unit: string;
  legend?: ReactNode;
}) {
  const id = useId();
  const frame = useRef<HTMLDivElement>(null);
  const width = useElementWidth(frame, 720);
  const count = axisLabels.length;
  const [selected, setSelected] = useState<number | null>(null);
  const active = Math.min(count - 1, selected ?? count - 1);
  const narrow = width < 480;
  const height = narrow ? 240 : 270;
  const top = 14;
  const bottom = height - 40;
  const left = narrow ? 56 : 72;
  const right = width - 10;
  const values = series.flatMap((item) =>
    item.values.filter((value): value is number => value !== null),
  );
  const ticks = niceTicks(
    Math.min(0, ...values),
    Math.max(0, ...values),
    narrow ? 3 : 4,
    integer,
  );
  const min = ticks[0];
  const max = ticks.at(-1)!;
  const y = (value: number) =>
    bottom - ((value - min) / (max - min || 1)) * (bottom - top);
  const band = (right - left) / Math.max(1, count);
  const x = (index: number) => left + band * (index + 0.5);
  const barSeries = series.filter((item) => item.kind === "bar");
  const barWidth = Math.max(
    2,
    Math.min(28, (band * 0.7) / Math.max(1, barSeries.length)),
  );
  const labelEvery = Math.max(
    1,
    Math.ceil(count / Math.floor((right - left) / (narrow ? 46 : 58))),
  );
  const markers = band >= 16;
  function path(values: (number | null)[]) {
    let continuing = false;
    return values
      .map((value, index) => {
        if (value === null) {
          continuing = false;
          return "";
        }
        const command = continuing ? "L" : "M";
        continuing = true;
        return `${command}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  }
  function area(values: (number | null)[]) {
    const points = values
      .map((value, index) => (value === null ? null : [x(index), y(value)]))
      .filter((point): point is number[] => point !== null);
    if (points.length < 2) return "";
    return `M${points[0][0]},${y(Math.max(0, min))} ${points.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`).join(" ")} L${points.at(-1)![0]},${y(Math.max(0, min))} Z`;
  }
  function bar(px: number, value: number) {
    const base = y(Math.max(0, min));
    const tip = y(value);
    const heightPx = Math.abs(base - tip);
    const radius = Math.min(4, heightPx, barWidth / 2);
    const x0 = px - barWidth / 2;
    const x1 = px + barWidth / 2;
    if (heightPx < 0.5) return "";
    return `M${x0},${base} V${tip + radius} Q${x0},${tip} ${x0 + radius},${tip} H${x1 - radius} Q${x1},${tip} ${x1},${tip + radius} V${base} Z`;
  }
  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {legend ?? <span />}
        <span className="text-xs text-[#6b7867]">Đơn vị: {unit}</span>
      </div>
      <div
        aria-live="polite"
        className="min-h-14 rounded-xl bg-[#f4f6f0] px-4 py-2.5 text-sm leading-6"
      >
        {count ? readout(active) : null}
      </div>
      <div
        ref={frame}
        className="mt-3 w-full rounded-lg outline-offset-4"
        tabIndex={0}
        aria-label={`${title}. Dùng phím mũi tên trái/phải để xem từng kỳ.`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setSelected(Math.max(0, active - 1));
          else if (event.key === "ArrowRight")
            setSelected(Math.min(count - 1, active + 1));
          else return;
          event.preventDefault();
        }}
        onMouseLeave={() => setSelected(null)}
      >
        <svg
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block max-w-full touch-pan-y select-none"
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-description`}>{description}</desc>
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={left}
                x2={right}
                y1={y(value)}
                y2={y(value)}
                stroke={value === 0 ? "#a6b39d" : "#edf0e7"}
                data-zero-y={value === 0 ? y(0) : undefined}
              />
              <text
                x={left - 8}
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7867"
              >
                {axisFormat(value)}
              </text>
            </g>
          ))}
          {count > 0 && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={top}
              y2={bottom}
              stroke="#c9d3c1"
            />
          )}
          {series.map((item, seriesIndex) =>
            item.kind === "bar" ? (
              <g key={item.key} data-series={item.key} fill={item.color}>
                {item.values.map((value, index) =>
                  value === null ? null : (
                    <path
                      key={index}
                      d={bar(
                        x(index) +
                          (seriesIndex - (barSeries.length - 1) / 2) * barWidth,
                        value,
                      )}
                      opacity={index === active ? 1 : 0.82}
                    />
                  ),
                )}
              </g>
            ) : (
              <g key={item.key}>
                {item.kind === "area" && (
                  <path
                    d={area(item.values)}
                    fill={item.color}
                    opacity={0.16}
                  />
                )}
                <path
                  data-series={item.key}
                  d={path(item.values)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {item.values.map((value, index) =>
                  value === null || (!markers && index !== active) ? null : (
                    <circle
                      key={index}
                      cx={x(index)}
                      cy={y(value)}
                      r={index === active ? 5 : 3.5}
                      fill={item.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ),
                )}
              </g>
            ),
          )}
          {axisLabels.map((label, index) =>
            index % labelEvery === 0 || index === count - 1
              ? (index === count - 1 ||
                  count - 1 - index >= labelEvery / 2) && (
                  <text
                    key={index}
                    x={x(index)}
                    y={bottom + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={index === active ? 600 : 400}
                    fill={index === active ? "#21372b" : "#6b7867"}
                  >
                    {label}
                  </text>
                )
              : null,
          )}
          {axisLabels.map((_, index) => (
            <rect
              key={index}
              x={left + band * index}
              y={top}
              width={band}
              height={bottom - top + 28}
              fill="transparent"
              onMouseEnter={() => setSelected(index)}
              onClick={() => setSelected(index)}
            >
              <title>{pointTitle(index)}</title>
            </rect>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; kind?: "line" | "bar" }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#4f5d4b]">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={
              item.kind === "bar"
                ? "size-3 rounded-sm"
                : "h-0.5 w-5 rounded-full"
            }
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
