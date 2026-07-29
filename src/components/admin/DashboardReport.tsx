"use client";

import { useMemo, useState } from "react";
import {
  aggregateRange,
  type CostPoint,
  type DealPoint,
  type RangeMetrics,
} from "@/lib/period-report";
import {
  PERIOD_PRESETS,
  rangeForPreset,
  type PeriodPreset,
} from "@/lib/periods";
import { formatEuroK } from "@/lib/status";

const PRESETS = PERIOD_PRESETS.filter((p) => p.key !== "all");

function pctChange(current: number, compare: number): number | null {
  if (compare === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - compare) / Math.abs(compare)) * 100;
}

function formatPct(pct: number | null): string {
  if (pct == null) return "n.v.t.";
  const rounded = Math.round(pct);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function Diff({
  current,
  compare,
  invertColors = false,
}: {
  current: number;
  compare: number;
  invertColors?: boolean;
}) {
  const pct = pctChange(current, compare);
  if (pct == null) {
    return <span className="dash-diff dash-diff-flat">{formatPct(pct)}</span>;
  }
  const up = pct > 0;
  const down = pct < 0;
  const good = invertColors ? down : up;
  const bad = invertColors ? up : down;
  return (
    <span
      className={`dash-diff${good ? " dash-diff-up" : ""}${bad ? " dash-diff-down" : ""}${!good && !bad ? " dash-diff-flat" : ""}`}
    >
      {formatPct(pct)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  compareValue,
  comparing,
  format = "number",
  invertColors = false,
  valueTone,
}: {
  label: string;
  value: number;
  compareValue?: number;
  comparing: boolean;
  format?: "number" | "eurok";
  invertColors?: boolean;
  /** Color the main figure green (>0) or red (<=0) */
  valueTone?: "profit";
}) {
  const display =
    format === "eurok"
      ? formatEuroK(value)
      : Math.round(value).toLocaleString("nl-NL");
  const compareDisplay =
    compareValue == null
      ? null
      : format === "eurok"
        ? formatEuroK(compareValue)
        : Math.round(compareValue).toLocaleString("nl-NL");

  const toneClass =
    valueTone === "profit"
      ? value > 0
        ? " dash-value-profit"
        : " dash-value-loss"
      : "";

  return (
    <div className={`crm-stat${comparing ? " dash-stat-compare" : ""}`}>
      <span>{label}</span>
      <strong className={toneClass.trim() || undefined}>{display}</strong>
      {comparing && compareValue != null && (
        <div className="dash-compare-meta">
          <span className="dash-compare-val">{compareDisplay}</span>
          <Diff
            current={value}
            compare={compareValue}
            invertColors={invertColors}
          />
        </div>
      )}
    </div>
  );
}

export function DashboardReport({
  deals,
  costs,
}: {
  deals: DealPoint[];
  costs: CostPoint[];
}) {
  const [period, setPeriod] = useState<PeriodPreset>("last_7");
  const [compareOn, setCompareOn] = useState(false);
  const [comparePeriod, setComparePeriod] =
    useState<PeriodPreset>("last_30");

  const primary = useMemo(() => {
    const r =
      rangeForPreset(period) ?? { from: "1970-01-01", to: "2999-12-31" };
    return { metrics: aggregateRange(deals, costs, r.from, r.to) };
  }, [deals, costs, period]);

  const compare = useMemo(() => {
    if (!compareOn) return null;
    const r =
      rangeForPreset(comparePeriod) ?? {
        from: "1970-01-01",
        to: "2999-12-31",
      };
    return { metrics: aggregateRange(deals, costs, r.from, r.to) };
  }, [deals, costs, compareOn, comparePeriod]);

  const m: RangeMetrics = primary.metrics;
  const c: RangeMetrics | null = compare?.metrics ?? null;

  return (
    <div className="dash-report">
      <div className="dash-report-controls">
        <label className="dash-select-wrap">
          <span>Periode</span>
          <select
            className="crm-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
          >
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`crm-btn${compareOn ? " crm-btn-primary" : ""}`}
          onClick={() => setCompareOn((v) => !v)}
        >
          Compare
        </button>

        {compareOn && (
          <label className="dash-select-wrap">
            <span>Vergelijk met</span>
            <select
              className="crm-select"
              value={comparePeriod}
              onChange={(e) =>
                setComparePeriod(e.target.value as PeriodPreset)
              }
            >
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="crm-grid crm-stats dash-stats">
        <MetricCard
          label="Bem. Vol"
          value={m.bemVol}
          compareValue={c?.bemVol}
          comparing={!!c}
          format="eurok"
        />
        <MetricCard
          label="Totale deals"
          value={m.deals}
          compareValue={c?.deals}
          comparing={!!c}
        />
        <MetricCard
          label="Ad spend"
          value={m.adSpend}
          compareValue={c?.adSpend}
          comparing={!!c}
          format="eurok"
          invertColors
        />
        <MetricCard
          label="Sales cost"
          value={m.salesCost}
          compareValue={c?.salesCost}
          comparing={!!c}
          format="eurok"
          invertColors
        />
        <MetricCard
          label="Winst"
          value={m.winst}
          compareValue={c?.winst}
          comparing={!!c}
          format="eurok"
          valueTone="profit"
        />
        <MetricCard
          label="Winst per deal"
          value={m.winstPerDeal}
          compareValue={c?.winstPerDeal}
          comparing={!!c}
          format="eurok"
          valueTone="profit"
        />
      </div>

      {c && (
        <p className="crm-muted dash-compare-hint">
          Vergelijking: geselecteerde periode vs compare-periode. Groen =
          stijging, rood = daling (bij kosten omgekeerd).
        </p>
      )}
    </div>
  );
}
