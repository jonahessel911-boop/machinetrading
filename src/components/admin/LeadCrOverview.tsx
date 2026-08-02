"use client";

import { useState } from "react";
import type { FunnelSiteStats } from "@/lib/funnel";

function formatPct(n: number | null) {
  if (n == null) return "—";
  if (!Number.isFinite(n)) return "0%";
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

export function LeadCrOverview({ sites }: { sites: FunnelSiteStats[] }) {
  const [open, setOpen] = useState<Set<string>>(() => {
    // Open first site by default
    const initial = new Set<string>();
    if (sites[0]) initial.add(sites[0].key);
    return initial;
  });

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="po-wrap">
      <p className="po-filter-hint" style={{ marginBottom: "0.85rem" }}>
        Unieke sessies per formstap. CR = % dat doorklikt vanaf de vorige stap.
        Meer websites verschijnen hier zodra die tracked worden.
      </p>

      <div className="crm-table-wrap">
        <table className="crm-table po-table">
          <thead>
            <tr>
              <th>Website / stap</th>
              <th>Sessies</th>
              <th>CR naar volgende</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => {
              const isOpen = open.has(site.key);
              return (
                <SiteRows
                  key={site.key}
                  site={site}
                  isOpen={isOpen}
                  onToggle={() => toggle(site.key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SiteRows({
  site,
  isOpen,
  onToggle,
}: {
  site: FunnelSiteStats;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="po-row po-row-year"
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <td>
          <div className="po-period">
            <span className={`po-caret${isOpen ? " open" : ""}`} aria-hidden>
              ▸
            </span>
            <span>{site.site}</span>
          </div>
        </td>
        <td>
          {site.totalStarts} → {site.totalDone}
        </td>
        <td>{formatPct(site.overallCrPct)} overall</td>
      </tr>
      {isOpen &&
        site.steps.map((step) => (
          <tr key={`${site.key}:${step.step}`} className="po-row po-row-day">
            <td>
              <div className="po-period" style={{ paddingLeft: "1.1rem" }}>
                <span className="po-caret-spacer" />
                <span>{step.label}</span>
              </div>
            </td>
            <td>{step.sessions}</td>
            <td>
              {step.crPct == null ? (
                <span className="crm-muted">eind</span>
              ) : (
                formatPct(step.crPct)
              )}
            </td>
          </tr>
        ))}
    </>
  );
}
