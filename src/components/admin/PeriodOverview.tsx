"use client";

import { useEffect, useMemo, useState } from "react";
import { SALES_REPS } from "@/lib/constants";
import {
  buildPeriodTree,
  type CostPoint,
  type DayMetrics,
  type DealPoint,
  type LeadPoint,
} from "@/lib/period-report";
import { formatEuroK } from "@/lib/status";

function money(n: number) {
  return formatEuroK(n);
}

function omzetPerDeal(node: DayMetrics) {
  return node.deals > 0 ? node.omzet / node.deals : 0;
}

function formatPct(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0%";
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function matchesRep(
  value: string | null | undefined,
  selected: Set<string>,
): boolean {
  if (selected.size === 0) return true;
  const name = (value || "").trim();
  if (!name) return false;
  return selected.has(name);
}

function Row({
  node,
  depth,
  open,
  toggle,
}: {
  node: DayMetrics;
  depth: number;
  open: Set<string>;
  toggle: (key: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isOpen = open.has(node.key);
  const winstClass =
    node.winst > 0 ? "dash-value-profit" : "dash-value-loss";

  return (
    <>
      <tr
        className={`po-row po-row-${node.level}${node.isCurrent ? " po-row-current" : ""}`}
        onClick={() => hasChildren && toggle(node.key)}
        style={{ cursor: hasChildren ? "pointer" : "default" }}
      >
        <td>
          <div className="po-period" style={{ paddingLeft: `${depth * 1.1}rem` }}>
            {hasChildren ? (
              <span className={`po-caret${isOpen ? " open" : ""}`} aria-hidden>
                ▸
              </span>
            ) : (
              <span className="po-caret-spacer" />
            )}
            <span>{node.label}</span>
            {node.isCurrent && <span className="po-badge">Huidig</span>}
          </div>
        </td>
        <td>{node.leads}</td>
        <td>{node.deals}</td>
        <td>{formatPct(node.conversiePct)}</td>
        <td>{money(node.bemVol)}</td>
        <td>{money(node.omzet)}</td>
        <td>{money(omzetPerDeal(node))}</td>
        <td>{money(node.salesCost)}</td>
        <td>{money(node.adSpend)}</td>
        <td className={winstClass}>{money(node.winst)}</td>
      </tr>
      {hasChildren &&
        isOpen &&
        node.children!.map((child) => (
          <Row
            key={child.key}
            node={child}
            depth={depth + 1}
            open={open}
            toggle={toggle}
          />
        ))}
    </>
  );
}

export function PeriodOverview({
  deals,
  leads,
  costs: initialCosts,
}: {
  deals: DealPoint[];
  leads: LeadPoint[];
  costs: CostPoint[];
  /** @deprecated kept for older callers */
  initialTree?: DayMetrics[];
  initialTotals?: DayMetrics;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [costs, setCosts] = useState(initialCosts);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [daysBack, setDaysBack] = useState(30);

  useEffect(() => {
    setCosts(initialCosts);
  }, [initialCosts]);

  const repOptions = useMemo(() => {
    const names = new Set<string>(SALES_REPS);
    for (const d of deals) {
      const n = d.verkoopmedewerker?.trim();
      if (n) names.add(n);
    }
    for (const l of leads) {
      const n = l.verkoopmedewerker?.trim();
      if (n) names.add(n);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "nl"));
  }, [deals, leads]);

  const tree = useMemo(() => {
    const filteredDeals = deals.filter((d) =>
      matchesRep(d.verkoopmedewerker, selected),
    );
    const filteredLeads = leads.filter((l) =>
      matchesRep(l.verkoopmedewerker, selected),
    );
    const filteredCosts = selected.size === 0 ? costs : [];
    return buildPeriodTree(filteredDeals, filteredCosts, filteredLeads);
  }, [deals, leads, costs, selected]);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set());
  }

  function toggleRep(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function syncMetaAds() {
    setSyncBusy(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/admin/meta-ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync mislukt");
      if (Array.isArray(data.costs)) setCosts(data.costs);
      const accountNames = (data.accounts ?? [])
        .map((a: { name: string }) => a.name)
        .join(", ");
      setSyncMsg(
        `Meta Ads gesynchroniseerd: ${data.updated ?? 0} dagen · ${formatEuroK(data.totalSpend ?? 0)} spend${accountNames ? ` · ${accountNames}` : ""}`,
      );
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync mislukt");
    } finally {
      setSyncBusy(false);
    }
  }

  const filterLabel =
    selected.size === 0
      ? "Alle medewerkers"
      : [...selected].sort((a, b) => a.localeCompare(b, "nl")).join(", ");

  return (
    <div className="crm-card">
      <div className="crm-card-head">Periode overzicht</div>
      <div className="crm-card-body po-filters">
        <div className="po-meta-sync">
          <div>
            <div className="po-filter-label">Meta Ads spend</div>
            <p className="crm-muted po-filter-hint" style={{ marginTop: 0 }}>
              Haalt ad spend op via je Meta access token en vult de rapportage.
            </p>
          </div>
          <div className="po-meta-sync-actions">
            <select
              className="crm-select"
              value={daysBack}
              disabled={syncBusy}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              aria-label="Aantal dagen terug"
            >
              <option value={7}>Laatste 7 dagen</option>
              <option value={14}>Laatste 14 dagen</option>
              <option value={30}>Laatste 30 dagen</option>
              <option value={60}>Laatste 60 dagen</option>
              <option value={90}>Laatste 90 dagen</option>
            </select>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={syncBusy}
              onClick={syncMetaAds}
            >
              {syncBusy ? "Bezig…" : "Sync Meta Ads"}
            </button>
          </div>
        </div>
        {syncMsg && <p className="crm-muted po-filter-hint">{syncMsg}</p>}

        <div className="po-filter-label">Verkoopmedewerker</div>
        <div
          className="po-filter-chips"
          role="group"
          aria-label="Filter verkoopmedewerker"
        >
          <button
            type="button"
            className={`po-chip${selected.size === 0 ? " is-active" : ""}`}
            onClick={selectAll}
          >
            Alles
          </button>
          {repOptions.map((name) => {
            const active = selected.has(name);
            return (
              <button
                key={name}
                type="button"
                className={`po-chip${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => toggleRep(name)}
              >
                {name}
              </button>
            );
          })}
        </div>
        <p className="crm-muted po-filter-hint">
          Toont: <strong>{filterLabel}</strong>
          {selected.size > 0
            ? " · ad spend / sales kosten alleen zichtbaar bij Alles"
            : ""}
        </p>
      </div>
      <div
        className="crm-table-wrap po-wrap"
        style={{ border: "none", boxShadow: "none" }}
      >
        <table className="crm-table po-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Leads</th>
              <th>Deals</th>
              <th>Conversie</th>
              <th>Bem. Vol</th>
              <th>Omzet</th>
              <th>Omzet / deal</th>
              <th>Sales kosten</th>
              <th>Ad spend</th>
              <th>Winst</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((node) => (
              <Row
                key={node.key}
                node={node}
                depth={0}
                open={open}
                toggle={toggle}
              />
            ))}
            {tree.length === 0 && (
              <tr>
                <td colSpan={10}>
                  Geen leads of deals voor deze selectie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
