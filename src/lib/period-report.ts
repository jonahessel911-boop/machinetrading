export type DayMetrics = {
  key: string;
  label: string;
  level: "year" | "month" | "week" | "day";
  adSpend: number;
  salesCost: number;
  /** Bemiddeld volume = som bruto inkoopprijs */
  bemVol: number;
  /** Omzet = som marge per deal */
  omzet: number;
  /** Winst = omzet − ad spend − sales cost */
  winst: number;
  leads: number;
  deals: number;
  /** deals / leads * 100 */
  conversiePct: number;
  winstPerDeal: number;
  isCurrent?: boolean;
  children?: DayMetrics[];
};

export type DealPoint = {
  date: string; // YYYY-MM-DD
  /** Bruto inkoopprijs */
  bemVol: number;
  /** Marge (business-omzet) */
  omzet: number;
};

/** Nieuwe lead (op created_at) */
export type LeadPoint = {
  date: string;
};

export type CostPoint = {
  date: string;
  adSpend: number;
  salesCost: number;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function startOfIsoWeek(d: Date): Date {
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() - (day - 1));
  return copy;
}

function isoWeekNumber(d: Date): number {
  const tmp = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DAY_LABELS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

function formatShortNl(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function emptyMetrics(
  key: string,
  label: string,
  level: DayMetrics["level"],
): DayMetrics {
  return {
    key,
    label,
    level,
    adSpend: 0,
    salesCost: 0,
    bemVol: 0,
    omzet: 0,
    winst: 0,
    leads: 0,
    deals: 0,
    conversiePct: 0,
    winstPerDeal: 0,
    children: [],
  };
}

function finalize(node: DayMetrics): DayMetrics {
  node.winst = node.omzet - node.adSpend - node.salesCost;
  node.winstPerDeal = node.deals > 0 ? node.winst / node.deals : 0;
  node.conversiePct =
    node.leads > 0 ? (node.deals / node.leads) * 100 : 0;
  if (node.children) {
    node.children = node.children.map(finalize);
  }
  return node;
}

function addDeal(node: DayMetrics, bemVol: number, omzet: number) {
  node.bemVol += bemVol;
  node.omzet += omzet;
  node.winst += omzet;
  node.deals += 1;
}

function addLead(node: DayMetrics) {
  node.leads += 1;
}

function addCost(node: DayMetrics, ad: number, sales: number) {
  node.adSpend += ad;
  node.salesCost += sales;
}

/** Bouwt jaar → maand → week → dag boom. */
export function buildPeriodTree(
  deals: DealPoint[],
  costs: CostPoint[],
  leads: LeadPoint[] = [],
  now = new Date(),
): DayMetrics[] {
  const todayKey = toDateKey(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
  const currentYear = String(now.getFullYear());
  const currentMonth = todayKey.slice(0, 7);

  const years = new Map<string, DayMetrics>();

  function ensureDay(dateKey: string): {
    year: DayMetrics;
    month: DayMetrics;
    week: DayMetrics;
    day: DayMetrics;
  } {
    const d = parseDateKey(dateKey);
    const yearKey = String(d.getUTCFullYear());
    const monthKey = dateKey.slice(0, 7);
    const weekStart = startOfIsoWeek(d);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekNum = isoWeekNumber(d);
    const weekKey = `${yearKey}-W${String(weekNum).padStart(2, "0")}`;

    let year = years.get(yearKey);
    if (!year) {
      year = emptyMetrics(yearKey, yearKey, "year");
      year.isCurrent = yearKey === currentYear;
      years.set(yearKey, year);
    }

    let month = year.children!.find((c) => c.key === monthKey);
    if (!month) {
      month = emptyMetrics(monthKey, monthKey, "month");
      month.isCurrent = monthKey === currentMonth;
      year.children!.push(month);
    }

    let week = month.children!.find((c) => c.key === weekKey);
    if (!week) {
      week = emptyMetrics(
        weekKey,
        `W${weekNum} · ${formatShortNl(weekStart)} – ${formatShortNl(weekEnd)}`,
        "week",
      );
      const ws = toDateKey(weekStart);
      const we = toDateKey(weekEnd);
      week.isCurrent = todayKey >= ws && todayKey <= we;
      month.children!.push(week);
    }

    let day = week.children!.find((c) => c.key === dateKey);
    if (!day) {
      day = emptyMetrics(
        dateKey,
        `${DAY_LABELS[d.getUTCDay()]} ${formatShortNl(d)}`,
        "day",
      );
      day.isCurrent = dateKey === todayKey;
      week.children!.push(day);
    }

    return { year, month, week, day };
  }

  for (const deal of deals) {
    const { year, month, week, day } = ensureDay(deal.date);
    addDeal(day, deal.bemVol, deal.omzet);
    addDeal(week, deal.bemVol, deal.omzet);
    addDeal(month, deal.bemVol, deal.omzet);
    addDeal(year, deal.bemVol, deal.omzet);
  }

  for (const lead of leads) {
    const { year, month, week, day } = ensureDay(lead.date);
    addLead(day);
    addLead(week);
    addLead(month);
    addLead(year);
  }

  for (const cost of costs) {
    const { year, month, week, day } = ensureDay(cost.date);
    addCost(day, cost.adSpend, cost.salesCost);
    addCost(week, cost.adSpend, cost.salesCost);
    addCost(month, cost.adSpend, cost.salesCost);
    addCost(year, cost.adSpend, cost.salesCost);
  }

  const tree = [...years.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((year) => {
      year.children = year.children!
        .sort((a, b) => b.key.localeCompare(a.key))
        .map((month) => {
          month.children = month.children!
            .sort((a, b) => b.key.localeCompare(a.key))
            .map((week) => {
              week.children = week.children!.sort((a, b) =>
                b.key.localeCompare(a.key),
              );
              return finalize(week);
            });
          return finalize(month);
        });
      return finalize(year);
    });

  return tree;
}

export function totalsFromTree(tree: DayMetrics[]): DayMetrics {
  const t = emptyMetrics("total", "Totaal", "year");
  for (const y of tree) {
    t.adSpend += y.adSpend;
    t.salesCost += y.salesCost;
    t.bemVol += y.bemVol;
    t.omzet += y.omzet;
    t.winst += y.winst;
    t.leads += y.leads;
    t.deals += y.deals;
  }
  return finalize(t);
}

export type RangeMetrics = {
  adSpend: number;
  salesCost: number;
  bemVol: number;
  omzet: number;
  winst: number;
  leads: number;
  deals: number;
  conversiePct: number;
  winstPerDeal: number;
};

export function emptyRangeMetrics(): RangeMetrics {
  return {
    adSpend: 0,
    salesCost: 0,
    bemVol: 0,
    omzet: 0,
    winst: 0,
    leads: 0,
    deals: 0,
    conversiePct: 0,
    winstPerDeal: 0,
  };
}

/** Inclusive YYYY-MM-DD range aggregation. */
export function aggregateRange(
  deals: DealPoint[],
  costs: CostPoint[],
  from: string,
  to: string,
  leads: LeadPoint[] = [],
): RangeMetrics {
  const m = emptyRangeMetrics();
  for (const d of deals) {
    if (d.date < from || d.date > to) continue;
    m.bemVol += d.bemVol;
    m.omzet += d.omzet;
    m.winst += d.omzet;
    m.deals += 1;
  }
  for (const l of leads) {
    if (l.date < from || l.date > to) continue;
    m.leads += 1;
  }
  for (const c of costs) {
    if (c.date < from || c.date > to) continue;
    m.adSpend += c.adSpend;
    m.salesCost += c.salesCost;
  }
  m.winst = m.omzet - m.adSpend - m.salesCost;
  m.winstPerDeal = m.deals > 0 ? m.winst / m.deals : 0;
  m.conversiePct = m.leads > 0 ? (m.deals / m.leads) * 100 : 0;
  return m;
}

/** @deprecated Netto-dealwaarde; business-omzet is marge. */
export function dealOmzet(lead: {
  inkoopprijs: number | null;
  marge: number | null;
  netto_inkoopprijs?: number | null;
  verkoopprijs?: number | null;
}): number {
  if (lead.netto_inkoopprijs != null) return lead.netto_inkoopprijs;
  if (lead.inkoopprijs != null && lead.marge != null) {
    return lead.inkoopprijs + lead.marge;
  }
  if (lead.verkoopprijs != null) return lead.verkoopprijs;
  if (lead.inkoopprijs != null) return lead.inkoopprijs;
  return 0;
}
