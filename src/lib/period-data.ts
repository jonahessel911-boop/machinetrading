import { getDemoStore, isDemoMode, newId, type PeriodCostRow } from "./demo-store";
import {
  buildPeriodTree,
  totalsFromTree,
  type CostPoint,
  type DayMetrics,
  type DealPoint,
} from "./period-report";
import { getSupabaseAdmin } from "./supabase";

export type PeriodReport = {
  tree: DayMetrics[];
  totals: DayMetrics;
};

export type DashboardSeries = {
  deals: DealPoint[];
  costs: CostPoint[];
};

export type BuyerDealPoint = {
  buyerId: string | null;
  date: string;
  /** Bruto inkoopprijs (bemiddeld volume) */
  waarde: number;
  /** Omzet = marge */
  omzet: number;
  /** Alias van marge */
  winst: number;
  leadId: string;
  naam: string;
  merk: string;
  model: string | null;
};

export type BuyerPeriodStats = {
  buyerId: string;
  bedrijf: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  dealerUsername: string | null;
  dealerEnabled: boolean;
  deals: number;
  waardeDeals: number;
  omzet: number;
  winst: number;
};

function dealDate(lead: {
  deal_datum: string | null;
  updated_at: string;
  created_at: string;
}): string {
  if (lead.deal_datum) return lead.deal_datum.slice(0, 10);
  return (lead.updated_at || lead.created_at).slice(0, 10);
}

export async function crmBuyerDealPoints(): Promise<BuyerDealPoint[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    return store.leads
      .filter((l) => l.status === "deal")
      .map((l) => ({
        buyerId: l.buyer_id,
        date: dealDate(l),
        waarde: l.inkoopprijs || 0,
        omzet: l.marge || 0,
        winst: l.marge || 0,
        leadId: l.id,
        naam: l.naam,
        merk: l.merk,
        model: l.model,
      }));
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, buyer_id, deal_datum, updated_at, created_at, inkoopprijs, marge, netto_inkoopprijs, verkoopprijs, naam, merk, model, status",
    )
    .eq("status", "deal");
  if (error) throw new Error(error.message);

  return (data ?? []).map((l) => {
    const row = l as {
      id: string;
      buyer_id: string | null;
      deal_datum: string | null;
      updated_at: string;
      created_at: string;
      inkoopprijs: number | null;
      marge: number | null;
      netto_inkoopprijs: number | null;
      verkoopprijs: number | null;
      naam: string;
      merk: string;
      model: string | null;
    };
    return {
      buyerId: row.buyer_id,
      date: dealDate(row),
      waarde: row.inkoopprijs || 0,
      omzet: row.marge || 0,
      winst: row.marge || 0,
      leadId: row.id,
      naam: row.naam,
      merk: row.merk,
      model: row.model,
    };
  });
}

export function aggregateBuyersForPeriod(
  buyers: {
    id: string;
    bedrijf: string;
    naam: string;
    email: string | null;
    telefoon: string | null;
    dealerUsername: string | null;
    dealerEnabled: boolean;
  }[],
  deals: BuyerDealPoint[],
  from: string | null,
  to: string | null,
): BuyerPeriodStats[] {
  const map = new Map<string, BuyerPeriodStats>();
  for (const b of buyers) {
    map.set(b.id, {
      buyerId: b.id,
      bedrijf: b.bedrijf,
      naam: b.naam,
      email: b.email,
      telefoon: b.telefoon,
      dealerUsername: b.dealerUsername,
      dealerEnabled: b.dealerEnabled,
      deals: 0,
      waardeDeals: 0,
      omzet: 0,
      winst: 0,
    });
  }

  for (const d of deals) {
    if (!d.buyerId) continue;
    if (from && to && (d.date < from || d.date > to)) continue;
    const row = map.get(d.buyerId);
    if (!row) continue;
    row.deals += 1;
    row.waardeDeals += d.waarde;
    row.omzet += d.omzet;
    row.winst += d.winst;
  }

  return [...map.values()].sort(
    (a, b) => b.omzet - a.omzet || b.deals - a.deals || a.bedrijf.localeCompare(b.bedrijf),
  );
}

export async function crmDashboardSeries(): Promise<DashboardSeries> {
  if (isDemoMode()) {
    const store = getDemoStore();
    return {
      deals: store.leads
        .filter((l) => l.status === "deal")
        .map((l) => ({
          date: dealDate(l),
          bemVol: l.inkoopprijs || 0,
          omzet: l.marge || 0,
        })),
      costs: (store.periodCosts ?? []).map((c) => ({
        date: c.cost_date,
        adSpend: c.ad_spend,
        salesCost: c.sales_cost,
      })),
    };
  }

  const supabase = getSupabaseAdmin();
  const [{ data: dealRows, error: dealError }, { data: costRows, error: costError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "deal_datum, updated_at, created_at, inkoopprijs, marge, netto_inkoopprijs, verkoopprijs, status",
        )
        .eq("status", "deal"),
      supabase.from("period_costs").select("*").order("cost_date", { ascending: false }),
    ]);

  if (dealError) throw new Error(dealError.message);
  if (costError) throw new Error(costError.message);

  return {
    deals: (dealRows ?? []).map((l) => {
      const row = l as {
        deal_datum: string | null;
        updated_at: string;
        created_at: string;
        inkoopprijs: number | null;
        marge: number | null;
      };
      return {
        date: dealDate(row),
        bemVol: Number(row.inkoopprijs) || 0,
        omzet: Number(row.marge) || 0,
      };
    }),
    costs: ((costRows ?? []) as PeriodCostRow[]).map((c) => ({
      date: c.cost_date,
      adSpend: Number(c.ad_spend) || 0,
      salesCost: Number(c.sales_cost) || 0,
    })),
  };
}

export async function crmPeriodReport(): Promise<PeriodReport> {
  const { deals, costs } = await crmDashboardSeries();
  const tree = buildPeriodTree(deals, costs);
  return { tree, totals: totalsFromTree(tree) };
}

export async function crmUpsertPeriodCost(input: {
  date: string;
  adSpend: number;
  salesCost: number;
  note?: string | null;
}): Promise<PeriodCostRow> {
  const date = input.date.slice(0, 10);
  const adSpend = Math.max(0, Number(input.adSpend) || 0);
  const salesCost = Math.max(0, Number(input.salesCost) || 0);
  const note = input.note?.trim() || null;

  if (isDemoMode()) {
    const store = getDemoStore();
    const existing = store.periodCosts.find((c) => c.cost_date === date);
    const now = new Date().toISOString();
    if (existing) {
      existing.ad_spend = adSpend;
      existing.sales_cost = salesCost;
      existing.note = note;
      existing.updated_at = now;
      return existing;
    }
    const row: PeriodCostRow = {
      id: newId("cost"),
      cost_date: date,
      ad_spend: adSpend,
      sales_cost: salesCost,
      note,
      created_at: now,
      updated_at: now,
    };
    store.periodCosts.unshift(row);
    return row;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("period_costs")
    .upsert(
      {
        cost_date: date,
        ad_spend: adSpend,
        sales_cost: salesCost,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cost_date" },
    )
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Opslaan mislukt");
  return data as PeriodCostRow;
}
