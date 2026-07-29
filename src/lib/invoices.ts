import type { BuyerRow } from "./mappers";
import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { getSupabaseAdmin } from "./supabase";

export type InvoiceStatus = "concept" | "verstuurd" | "betaald" | "geannuleerd";

export type InvoiceRow = {
  id: string;
  buyer_id: string;
  lead_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  description: string | null;
  amount_ex_btw: number;
  btw_pct: number;
  btw_amount: number;
  amount_inc_btw: number;
  currency: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  buyerId: string;
  leadId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  description: string | null;
  amountExBtw: number;
  btwPct: number;
  btwAmount: number;
  amountIncBtw: number;
  currency: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceSettings = {
  invoiceBedrijf: string | null;
  invoiceContact: string | null;
  invoiceEmail: string | null;
  invoiceTelefoon: string | null;
  invoiceStraat: string | null;
  invoiceHuisnummer: string | null;
  invoicePostcode: string | null;
  invoiceWoonplaats: string | null;
  invoiceLand: string | null;
  invoiceKvk: string | null;
  invoiceBtw: string | null;
  invoiceIban: string | null;
  invoiceBic: string | null;
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  concept: "Draft",
  verstuurd: "Verstuurd",
  betaald: "Betaald",
  geannuleerd: "Geannuleerd",
};

export function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    leadId: row.lead_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    description: row.description,
    amountExBtw: Number(row.amount_ex_btw) || 0,
    btwPct: Number(row.btw_pct) || 0,
    btwAmount: Number(row.btw_amount) || 0,
    amountIncBtw: Number(row.amount_inc_btw) || 0,
    currency: row.currency || "EUR",
    notes: row.notes,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInvoiceSettings(row: BuyerRow): InvoiceSettings {
  const r = row as BuyerRow & Record<string, unknown>;
  return {
    invoiceBedrijf: (r.invoice_bedrijf as string | null) ?? null,
    invoiceContact: (r.invoice_contact as string | null) ?? null,
    invoiceEmail: (r.invoice_email as string | null) ?? null,
    invoiceTelefoon: (r.invoice_telefoon as string | null) ?? null,
    invoiceStraat: (r.invoice_straat as string | null) ?? null,
    invoiceHuisnummer: (r.invoice_huisnummer as string | null) ?? null,
    invoicePostcode: (r.invoice_postcode as string | null) ?? null,
    invoiceWoonplaats: (r.invoice_woonplaats as string | null) ?? null,
    invoiceLand: (r.invoice_land as string | null) ?? "Nederland",
    invoiceKvk: (r.invoice_kvk as string | null) ?? null,
    invoiceBtw: (r.invoice_btw as string | null) ?? null,
    invoiceIban: (r.invoice_iban as string | null) ?? null,
    invoiceBic: (r.invoice_bic as string | null) ?? null,
  };
}

function calcAmounts(ex: number, btwPct: number) {
  const amountExBtw = Math.max(0, Number(ex) || 0);
  const pct = Math.max(0, Number(btwPct) || 0);
  const btwAmount = Math.round(amountExBtw * (pct / 100) * 100) / 100;
  const amountIncBtw = Math.round((amountExBtw + btwAmount) * 100) / 100;
  return { amountExBtw, btwPct: pct, btwAmount, amountIncBtw };
}

function nextInvoiceNumber(existing: InvoiceRow[]): string {
  const year = new Date().getFullYear();
  const prefix = `HV-${year}-`;
  let max = 0;
  for (const inv of existing) {
    if (!inv.invoice_number.startsWith(prefix)) continue;
    const n = Number(inv.invoice_number.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function crmListInvoicesForBuyer(
  buyerId: string,
  opts?: { includeDrafts?: boolean },
): Promise<Invoice[]> {
  const includeDrafts = opts?.includeDrafts ?? true;
  if (isDemoMode()) {
    return getDemoStore()
      .invoices.filter((i) => {
        if (i.buyer_id !== buyerId) return false;
        if (!includeDrafts && i.status === "concept") return false;
        return true;
      })
      .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
      .map(mapInvoice);
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("invoices")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("issue_date", { ascending: false });
  if (!includeDrafts) {
    query = query.neq("status", "concept");
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapInvoice(r as InvoiceRow));
}

export async function crmGetInvoice(id: string): Promise<Invoice | null> {
  if (isDemoMode()) {
    const row = getDemoStore().invoices.find((i) => i.id === id);
    return row ? mapInvoice(row) : null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapInvoice(data as InvoiceRow) : null;
}

export async function crmFindOpenInvoiceForLead(
  leadId: string,
): Promise<Invoice | null> {
  if (isDemoMode()) {
    const row = getDemoStore().invoices.find(
      (i) => i.lead_id === leadId && i.status !== "geannuleerd",
    );
    return row ? mapInvoice(row) : null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("lead_id", leadId)
    .neq("status", "geannuleerd")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapInvoice(data as InvoiceRow) : null;
}

export async function crmUpdateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<Invoice> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (status === "betaald") patch.paid_at = now;
  if (status === "concept" || status === "verstuurd" || status === "geannuleerd") {
    patch.paid_at = null;
  }

  if (isDemoMode()) {
    const store = getDemoStore();
    const idx = store.invoices.findIndex((i) => i.id === id);
    if (idx < 0) throw new Error("Factuur niet gevonden");
    Object.assign(store.invoices[idx], patch);
    return mapInvoice(store.invoices[idx]);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Status bijwerken mislukt");
  return mapInvoice(data as InvoiceRow);
}

/** Draft-factuur bij koopovereenkomst (bemiddelingsfee = marge). */
export async function crmEnsureDraftInvoiceForDeal(input: {
  buyerId: string;
  leadId: string;
  amountExBtw: number;
  description: string;
  dueDays?: number;
}): Promise<Invoice | null> {
  const existing = await crmFindOpenInvoiceForLead(input.leadId);
  if (existing) return existing;

  const due = new Date();
  due.setDate(due.getDate() + (input.dueDays ?? 14));
  return crmCreateInvoice({
    buyerId: input.buyerId,
    leadId: input.leadId,
    description: input.description,
    amountExBtw: Math.max(0, input.amountExBtw),
    btwPct: 21,
    dueDate: due.toISOString().slice(0, 10),
    status: "concept",
  });
}

export async function crmListAllInvoices(): Promise<Invoice[]> {
  if (isDemoMode()) {
    return getDemoStore()
      .invoices.slice()
      .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
      .map(mapInvoice);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapInvoice(r as InvoiceRow));
}

export async function crmCreateInvoice(input: {
  buyerId: string;
  leadId?: string | null;
  description?: string | null;
  amountExBtw: number;
  btwPct?: number;
  issueDate?: string;
  dueDate?: string | null;
  status?: InvoiceStatus;
  notes?: string | null;
}): Promise<Invoice> {
  const amounts = calcAmounts(input.amountExBtw, input.btwPct ?? 21);
  const issueDate =
    input.issueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const dueDate = input.dueDate?.slice(0, 10) || null;
  const status = input.status ?? "concept";
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const store = getDemoStore();
    const row: InvoiceRow = {
      id: newId("inv"),
      buyer_id: input.buyerId,
      lead_id: input.leadId ?? null,
      invoice_number: nextInvoiceNumber(store.invoices),
      status,
      issue_date: issueDate,
      due_date: dueDate,
      description: input.description?.trim() || null,
      amount_ex_btw: amounts.amountExBtw,
      btw_pct: amounts.btwPct,
      btw_amount: amounts.btwAmount,
      amount_inc_btw: amounts.amountIncBtw,
      currency: "EUR",
      notes: input.notes?.trim() || null,
      paid_at: status === "betaald" ? now : null,
      created_at: now,
      updated_at: now,
    };
    store.invoices.unshift(row);
    return mapInvoice(row);
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: listErr } = await supabase
    .from("invoices")
    .select("invoice_number");
  if (listErr) throw new Error(listErr.message);
  const invoiceNumber = nextInvoiceNumber(
    (existing ?? []).map((r) => ({
      invoice_number: (r as { invoice_number: string }).invoice_number,
    })) as InvoiceRow[],
  );

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      buyer_id: input.buyerId,
      lead_id: input.leadId ?? null,
      invoice_number: invoiceNumber,
      status,
      issue_date: issueDate,
      due_date: dueDate,
      description: input.description?.trim() || null,
      amount_ex_btw: amounts.amountExBtw,
      btw_pct: amounts.btwPct,
      btw_amount: amounts.btwAmount,
      amount_inc_btw: amounts.amountIncBtw,
      currency: "EUR",
      notes: input.notes?.trim() || null,
      paid_at: status === "betaald" ? now : null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Factuur aanmaken mislukt");
  return mapInvoice(data as InvoiceRow);
}

export async function crmGetInvoiceSettings(
  buyerId: string,
): Promise<InvoiceSettings | null> {
  if (isDemoMode()) {
    const buyer = getDemoStore().buyers.find((b) => b.id === buyerId);
    return buyer ? mapInvoiceSettings(buyer) : null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .select("*")
    .eq("id", buyerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapInvoiceSettings(data as BuyerRow);
}

export async function crmUpdateInvoiceSettings(
  buyerId: string,
  patch: Partial<InvoiceSettings>,
): Promise<InvoiceSettings> {
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.invoiceBedrijf !== undefined)
    dbPatch.invoice_bedrijf = patch.invoiceBedrijf?.trim() || null;
  if (patch.invoiceBedrijf?.trim()) {
    dbPatch.bedrijf = patch.invoiceBedrijf.trim();
  }
  if (patch.invoiceContact !== undefined)
    dbPatch.invoice_contact = patch.invoiceContact?.trim() || null;
  if (patch.invoiceContact?.trim()) {
    dbPatch.naam = patch.invoiceContact.trim();
  }
  if (patch.invoiceEmail !== undefined)
    dbPatch.invoice_email = patch.invoiceEmail?.trim() || null;
  if (patch.invoiceTelefoon !== undefined)
    dbPatch.invoice_telefoon = patch.invoiceTelefoon?.trim() || null;
  if (patch.invoiceStraat !== undefined)
    dbPatch.invoice_straat = patch.invoiceStraat?.trim() || null;
  if (patch.invoiceHuisnummer !== undefined)
    dbPatch.invoice_huisnummer = patch.invoiceHuisnummer?.trim() || null;
  if (patch.invoicePostcode !== undefined)
    dbPatch.invoice_postcode = patch.invoicePostcode?.trim() || null;
  if (patch.invoiceWoonplaats !== undefined)
    dbPatch.invoice_woonplaats = patch.invoiceWoonplaats?.trim() || null;
  if (patch.invoiceLand !== undefined)
    dbPatch.invoice_land = patch.invoiceLand?.trim() || "Nederland";
  if (patch.invoiceKvk !== undefined)
    dbPatch.invoice_kvk = patch.invoiceKvk?.trim() || null;
  if (patch.invoiceBtw !== undefined)
    dbPatch.invoice_btw = patch.invoiceBtw?.trim() || null;
  if (patch.invoiceIban !== undefined)
    dbPatch.invoice_iban = patch.invoiceIban?.trim() || null;
  if (patch.invoiceBic !== undefined)
    dbPatch.invoice_bic = patch.invoiceBic?.trim() || null;

  if (isDemoMode()) {
    const store = getDemoStore();
    const idx = store.buyers.findIndex((b) => b.id === buyerId);
    if (idx < 0) throw new Error("Koper niet gevonden");
    Object.assign(store.buyers[idx], dbPatch);
    return mapInvoiceSettings(store.buyers[idx]);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .update(dbPatch)
    .eq("id", buyerId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Opslaan mislukt");
  return mapInvoiceSettings(data as BuyerRow);
}
