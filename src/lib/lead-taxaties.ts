import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { getSupabaseAdmin } from "./supabase";
import type { TaxatieInput, TaxatieResult } from "./taxatie";

export type LeadTaxatieRow = {
  id: string;
  lead_id: string;
  input: TaxatieInput | Record<string, unknown>;
  result: TaxatieResult;
  verkoop_min: number | null;
  verkoop_max: number | null;
  inkoop_min: number | null;
  inkoop_max: number | null;
  conservatief: number | null;
  created_at: string;
};

export type LeadTaxatie = {
  id: string;
  leadId: string;
  input: TaxatieInput | Record<string, unknown>;
  result: TaxatieResult;
  verkoopMin: number | null;
  verkoopMax: number | null;
  inkoopMin: number | null;
  inkoopMax: number | null;
  conservatief: number | null;
  createdAt: string;
};

function priceSummary(result: TaxatieResult) {
  const p = result.prijsadvies;
  const verkoopMin = p.verwachte_verkoopprijs_min || p.verwachte_verkoopprijs;
  const verkoopMax = p.verwachte_verkoopprijs_max || p.verwachte_verkoopprijs;
  const inkoopMin = Math.min(p.openingsbod, p.aanbevolen_inkoopprijs);
  const inkoopMax = p.maximum_inkoopprijs || p.aanbevolen_inkoopprijs;
  const conservatief = Math.round(
    Math.min(inkoopMin, p.aanbevolen_inkoopprijs) * 0.75,
  );
  return { verkoopMin, verkoopMax, inkoopMin, inkoopMax, conservatief };
}

function mapRow(row: LeadTaxatieRow): LeadTaxatie {
  return {
    id: row.id,
    leadId: row.lead_id,
    input: row.input,
    result: row.result,
    verkoopMin: row.verkoop_min,
    verkoopMax: row.verkoop_max,
    inkoopMin: row.inkoop_min,
    inkoopMax: row.inkoop_max,
    conservatief: row.conservatief,
    createdAt: row.created_at,
  };
}

export async function crmGetLatestLeadTaxatie(
  leadId: string,
): Promise<LeadTaxatie | null> {
  if (isDemoMode()) {
    const rows = getDemoStore()
      .taxaties.filter((t) => t.lead_id === leadId)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_taxaties")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as LeadTaxatieRow);
}

export async function crmSaveLeadTaxatie(input: {
  leadId: string;
  form: TaxatieInput | Record<string, unknown>;
  result: TaxatieResult;
}): Promise<LeadTaxatie> {
  const prices = priceSummary(input.result);
  const now = new Date().toISOString();
  const row: LeadTaxatieRow = {
    id: newId("tax"),
    lead_id: input.leadId,
    input: input.form,
    result: input.result,
    verkoop_min: prices.verkoopMin,
    verkoop_max: prices.verkoopMax,
    inkoop_min: prices.inkoopMin,
    inkoop_max: prices.inkoopMax,
    conservatief: prices.conservatief,
    created_at: now,
  };

  if (isDemoMode()) {
    getDemoStore().taxaties.unshift(row);
    return mapRow(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_taxaties")
    .insert({
      id: row.id,
      lead_id: row.lead_id,
      input: row.input,
      result: row.result,
      verkoop_min: row.verkoop_min,
      verkoop_max: row.verkoop_max,
      inkoop_min: row.inkoop_min,
      inkoop_max: row.inkoop_max,
      conservatief: row.conservatief,
      created_at: row.created_at,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as LeadTaxatieRow);
}
