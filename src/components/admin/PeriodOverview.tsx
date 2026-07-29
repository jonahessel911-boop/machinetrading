"use client";

import { useState } from "react";
import type { DayMetrics } from "@/lib/period-report";
import { formatEuro } from "@/lib/status";

function money(n: number) {
  return formatEuro(n);
}

function omzetPerDeal(node: DayMetrics) {
  return node.deals > 0 ? node.omzet / node.deals : 0;
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
        <td>{money(node.bemVol)}</td>
        <td>{money(node.omzet)}</td>
        <td>{node.deals}</td>
        <td>{money(omzetPerDeal(node))}</td>
        <td>{money(node.salesCost)}</td>
        <td>{money(node.adSpend)}</td>
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
  initialTree,
}: {
  initialTree: DayMetrics[];
  initialTotals: DayMetrics;
}) {
  const [tree] = useState(initialTree);
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="crm-card">
      <div className="crm-card-head">Periode overzicht</div>
      <div
        className="crm-table-wrap po-wrap"
        style={{ border: "none", boxShadow: "none" }}
      >
        <table className="crm-table po-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Bem. Vol</th>
              <th>Omzet</th>
              <th>Deals</th>
              <th>Omzet / deal</th>
              <th>Sales kosten</th>
              <th>Ad spend</th>
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
                <td colSpan={7}>Nog geen deals of kosten in een periode.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
