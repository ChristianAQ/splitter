import { useId, useLayoutEffect, useState } from "react";
import { ChartLegend, ChartTooltip } from "./ChartTooltip";
import { useScrub } from "./useScrub";

export interface PaceSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  /** Running total per day; index 0 is day 1. May stop short (today). */
  values: number[];
}

interface Props {
  /** First is the one being read (drawn on top, with an area under it). */
  series: PaceSeries[];
  /** How many days the x axis spans. */
  days: number;
  formatValue: (value: number) => string;
  /** "noviembre" — the tooltip title reads "12 de noviembre". */
  monthName: string;
  caption: string;
  height?: number;
}

const PAD = { top: 8, right: 6, bottom: 22, left: 6 };

/** A "nice" ceiling for the y axis: 1, 2 or 5 times a power of ten. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const n = value / power;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power;
}

/**
 * Running total through a month, day by day, against another month: are
 * you ahead or behind where you were? Scrub across it to read both lines on
 * any day.
 */
export function PaceLine({ series, days, formatValue, monthName, caption, height = 150 }: Props) {
  const { ref, active, handlers } = useScrub(days, "point");
  const [width, setWidth] = useState(320);
  const gradientId = `pace-fill-${useId().replace(/:/g, "")}`;

  // Measured before the first paint: drawn at a guessed width first, the
  // chart could stick out past a narrow screen for a frame.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.max(el.clientWidth, 120));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(entry.contentRect.width, 120)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days <= 1 ? 0 : (i / (days - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const ticks = [1, 8, 15, 22, days].filter((d, i, all) => d <= days && all.indexOf(d) === i && !(d !== days && days - d < 4));
  const lead = series[0];

  return (
    <figure className="relative">
      <div className="mb-3">
        <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, color: s.color, shape: "line", dashed: s.dashed }))} />
      </div>
      <div
        ref={ref}
        {...handlers}
        tabIndex={0}
        role="group"
        aria-label={`${caption}. Usa las flechas para recorrerlo.`}
        className="relative cursor-crosshair select-none rounded-lg outline-offset-4"
        style={{ touchAction: "pan-y", WebkitTapHighlightColor: "transparent" }}
      >
        {active !== null && (
          <ChartTooltip
            title={`${active + 1} de ${monthName}`}
            x={days <= 1 ? 0.5 : active / (days - 1)}
            rows={series.map((s) => ({
              key: s.key,
              label: s.label,
              value: active < s.values.length ? formatValue(s.values[active]) : "—",
              color: s.color,
              dashed: s.dashed,
            }))}
          />
        )}
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={lead.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lead.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Recessive grid: the halfway line and the top, labelled inside the plot. */}
          {[0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(max * f)} y2={y(max * f)} className="stroke-neutral-900/[0.07] dark:stroke-white/10" strokeDasharray="2 4" />
              <text x={PAD.left} y={y(max * f) - 4} className="fill-neutral-400 text-[10px] dark:fill-neutral-500">
                {formatValue(max * f).replace(/,00/, "")}
              </text>
            </g>
          ))}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} className="stroke-neutral-900/15 dark:stroke-white/20" />
          {ticks.map((d) => (
            <text key={d} x={x(d - 1)} y={height - 6} textAnchor={d === 1 ? "start" : d === days ? "end" : "middle"} className="fill-neutral-500 text-[10px] dark:fill-neutral-400">
              {d}
            </text>
          ))}

          {lead.values.length > 1 && (
            <path d={`${path(lead.values)}L${x(lead.values.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#${gradientId})`} />
          )}
          {[...series].reverse().map((s) => (
            <path
              key={s.key}
              d={path(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "4 4" : undefined}
            />
          ))}
          {/* Where the lead line is today. */}
          {active === null && lead.values.length > 0 && (
            <circle cx={x(lead.values.length - 1)} cy={y(lead.values[lead.values.length - 1])} r={4} fill={lead.color} className="stroke-white dark:stroke-neutral-900" strokeWidth={2} />
          )}

          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} className="stroke-neutral-900/30 dark:stroke-white/40" strokeWidth={1} />
              {series.map((s) =>
                active < s.values.length ? (
                  <circle key={s.key} cx={x(active)} cy={y(s.values[active])} r={4} fill={s.color} className="stroke-white dark:stroke-neutral-900" strokeWidth={2} />
                ) : null
              )}
            </g>
          )}
        </svg>
      </div>
      {/* The sr-only box is a div, not the table itself: a table can't be
       * squeezed to 1px, so an sr-only <table> keeps its full width and
       * makes the page wider than the screen (pannable sideways on iOS). */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Día</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }, (_, i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                {series.map((s) => (
                  <td key={s.key}>{i < s.values.length ? formatValue(s.values[i]) : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
