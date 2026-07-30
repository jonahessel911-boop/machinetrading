import {
  mapBuyer,
  mapLead,
  type Buyer,
  type BuyerRow,
  type ContractRow,
  type Lead,
  type LeadPhotoRow,
  type LeadRow,
} from "./mappers";
import {
  getDemoStore,
  isDemoMode,
  newId,
  type DemoStore,
} from "./demo-store";
import { getSupabaseAdmin } from "./supabase";

export { isDemoMode };

type LeadFull = LeadRow & {
  buyer?: BuyerRow | null;
  photos?: LeadPhotoRow[];
  contracts?: (ContractRow & { buyer?: BuyerRow | null })[];
};

function hydrateLead(store: DemoStore, lead: LeadRow): LeadFull {
  const buyer = lead.buyer_id
    ? store.buyers.find((b) => b.id === lead.buyer_id) ?? null
    : null;
  const photos = store.photos.filter((p) => p.lead_id === lead.id);
  const contracts = store.contracts
    .filter((c) => c.lead_id === lead.id)
    .map((c) => ({
      ...c,
      buyer: store.buyers.find((b) => b.id === c.buyer_id) ?? null,
    }));
  return { ...lead, buyer, photos, contracts };
}

export type LeadListFilters = {
  status?: string | null;
  archive?: boolean;
  q?: string | null;
  limit?: number;
};

export async function crmListLeads(
  filters: LeadListFilters = {},
): Promise<Lead[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    let rows = [...store.leads];
    if (filters.status) {
      rows = rows.filter((l) => l.status === filters.status);
    } else if (!filters.archive) {
      rows = rows.filter((l) => l.status !== "geen_contact");
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      rows = rows.filter((l) =>
        [
          l.naam,
          l.email,
          l.telefoon,
          l.woonplaats,
          l.merk,
          l.model,
          l.postcode,
          l.straat,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    rows.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (filters.limit) rows = rows.slice(0, filters.limit);
    return rows.map((l) => mapLead(hydrateLead(store, l)));
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("leads")
    .select("*, buyer:buyers(*), photos:lead_photos(id)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  else if (!filters.archive) query = query.neq("status", "geen_contact");

  if (filters.q) {
    const q = filters.q;
    query = query.or(
      `naam.ilike.%${q}%,email.ilike.%${q}%,telefoon.ilike.%${q}%,woonplaats.ilike.%${q}%,merk.ilike.%${q}%,model.ilike.%${q}%,postcode.ilike.%${q}%,straat.ilike.%${q}%`,
    );
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapLead(row as LeadFull));
}

export async function crmGetLead(id: string): Promise<Lead | null> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const lead = store.leads.find((l) => l.id === id);
    if (!lead) return null;
    return mapLead(hydrateLead(store, lead));
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "*, buyer:buyers(*), photos:lead_photos(*), contracts:contracts(*, buyer:buyers(*))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapLead(data as LeadFull);
}

export async function crmUpdateLead(
  id: string,
  patch: Record<string, unknown>,
): Promise<Lead | null> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const idx = store.leads.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    store.leads[idx] = {
      ...store.leads[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    } as LeadRow;
    return mapLead(hydrateLead(store, store.leads[idx]));
  }

  const supabase = getSupabaseAdmin();
  const { error: updateError } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);
  return crmGetLead(id);
}

export async function crmCreateLead(
  input: Partial<LeadRow> & {
    merk: string;
    timing: string;
    naam: string;
    email: string;
    telefoon: string;
    woonplaats: string;
  },
): Promise<Lead> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const now = new Date().toISOString();
    const row: LeadRow = {
      id: newId("lead"),
      merk: input.merk,
      model: input.model ?? "Onbekend",
      timing: input.timing,
      naam: input.naam,
      email: input.email,
      telefoon: input.telefoon,
      straat: input.straat ?? null,
      huisnummer: input.huisnummer ?? null,
      toevoeging: input.toevoeging ?? null,
      postcode: input.postcode ?? null,
      woonplaats: input.woonplaats,
      status: "nieuw",
      contact_attempts: 0,
      inkoopprijs: null,
      marge: null,
      verkoopprijs: null,
      netto_inkoopprijs: null,
      deal_datum: null,
      bedrijfsnaam: null,
      verkoopmedewerker: null,
      buyer_id: null,
      created_at: now,
      updated_at: now,
    };
    store.leads.unshift(row);
    return mapLead(hydrateLead(store, row));
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      merk: input.merk,
      model: input.model ?? "Onbekend",
      timing: input.timing,
      naam: input.naam,
      email: input.email,
      telefoon: input.telefoon,
      straat: input.straat ?? null,
      huisnummer: input.huisnummer ?? null,
      toevoeging: input.toevoeging ?? null,
      postcode: input.postcode ?? null,
      woonplaats: input.woonplaats,
      status: "nieuw",
      contact_attempts: 0,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Kon lead niet opslaan");
  return mapLead(data as LeadRow);
}

export async function crmListBuyers(): Promise<
  (Buyer & { _count: { leads: number } })[]
> {
  if (isDemoMode()) {
    const store = getDemoStore();
    return store.buyers
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map((b) => ({
        ...mapBuyer(b),
        _count: {
          leads: store.leads.filter((l) => l.buyer_id === b.id).length,
        },
      }));
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .select("*, leads(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const mapped = mapBuyer(row as BuyerRow);
    const countRel = (row as { leads?: { count: number }[] }).leads;
    return {
      ...mapped,
      _count: { leads: countRel?.[0]?.count ?? 0 },
    };
  });
}

export async function crmListBuyersSimple(): Promise<Buyer[]> {
  if (isDemoMode()) {
    return getDemoStore()
      .buyers.slice()
      .sort((a, b) => a.bedrijf.localeCompare(b.bedrijf))
      .map(mapBuyer);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .select("*")
    .order("bedrijf", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => mapBuyer(b as BuyerRow));
}

export async function crmCreateBuyer(input: {
  naam: string;
  bedrijf: string;
  email?: string | null;
  telefoon?: string | null;
  dealerUsername?: string | null;
  dealerPassword?: string | null;
  dealerEnabled?: boolean;
  invoice?: {
    invoiceBedrijf?: string | null;
    invoiceContact?: string | null;
    invoiceEmail?: string | null;
    invoiceTelefoon?: string | null;
    invoiceStraat?: string | null;
    invoiceHuisnummer?: string | null;
    invoicePostcode?: string | null;
    invoiceWoonplaats?: string | null;
    invoiceLand?: string | null;
    invoiceKvk?: string | null;
    invoiceBtw?: string | null;
    invoiceIban?: string | null;
    invoiceBic?: string | null;
  };
}): Promise<Buyer> {
  const { hashPassword } = await import("./password");
  const username = input.dealerUsername?.trim() || null;
  const passwordHash =
    username && input.dealerPassword
      ? hashPassword(input.dealerPassword)
      : null;
  const enabled = Boolean(username && passwordHash && input.dealerEnabled !== false);
  const inv = input.invoice;

  const invoiceCols = {
    invoice_bedrijf: inv?.invoiceBedrijf?.trim() || input.bedrijf,
    invoice_contact: inv?.invoiceContact?.trim() || input.naam,
    invoice_email: inv?.invoiceEmail?.trim() || input.email || null,
    invoice_telefoon: inv?.invoiceTelefoon?.trim() || input.telefoon || null,
    invoice_straat: inv?.invoiceStraat?.trim() || null,
    invoice_huisnummer: inv?.invoiceHuisnummer?.trim() || null,
    invoice_postcode: inv?.invoicePostcode?.trim() || null,
    invoice_woonplaats: inv?.invoiceWoonplaats?.trim() || null,
    invoice_land: inv?.invoiceLand?.trim() || "Nederland",
    invoice_kvk: inv?.invoiceKvk?.trim() || null,
    invoice_btw: inv?.invoiceBtw?.trim() || null,
    invoice_iban: inv?.invoiceIban?.trim() || null,
    invoice_bic: inv?.invoiceBic?.trim() || null,
  };

  if (isDemoMode()) {
    const store = getDemoStore();
    if (username) {
      const taken = store.buyers.some(
        (b) => b.dealer_username?.toLowerCase() === username.toLowerCase(),
      );
      if (taken) throw new Error("Dit e-mailadres heeft al een dealer-login");
    }
    const now = new Date().toISOString();
    const row: BuyerRow = {
      id: newId("buyer"),
      naam: input.naam,
      bedrijf: input.bedrijf,
      email: input.email ?? null,
      telefoon: input.telefoon ?? null,
      dealer_username: username,
      dealer_password_hash: passwordHash,
      dealer_enabled: enabled,
      created_at: now,
      updated_at: now,
      ...invoiceCols,
    };
    store.buyers.unshift(row);
    return mapBuyer(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .insert({
      naam: input.naam,
      bedrijf: input.bedrijf,
      email: input.email ?? null,
      telefoon: input.telefoon ?? null,
      dealer_username: username,
      dealer_password_hash: passwordHash,
      dealer_enabled: enabled,
      ...invoiceCols,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Mislukt");
  return mapBuyer(data as BuyerRow);
}

export async function crmFindDealerByUsername(
  username: string,
): Promise<BuyerRow | null> {
  const u = username.trim().toLowerCase();
  if (!u) return null;

  if (isDemoMode()) {
    return (
      getDemoStore().buyers.find(
        (b) =>
          b.dealer_enabled &&
          b.dealer_username?.toLowerCase() === u &&
          b.dealer_password_hash,
      ) ?? null
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .select("*")
    .ilike("dealer_username", u)
    .eq("dealer_enabled", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BuyerRow) ?? null;
}

export async function crmUpdateBuyer(
  id: string,
  patch: Record<string, unknown>,
): Promise<Buyer | null> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const idx = store.buyers.findIndex((b) => b.id === id);
    if (idx < 0) return null;
    store.buyers[idx] = {
      ...store.buyers[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    } as BuyerRow;
    return mapBuyer(store.buyers[idx]);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Mislukt");
  return mapBuyer(data as BuyerRow);
}

export async function crmDeleteBuyer(id: string): Promise<void> {
  if (isDemoMode()) {
    const store = getDemoStore();
    for (const lead of store.leads) {
      if (lead.buyer_id === id) lead.buyer_id = null;
    }
    store.contracts = store.contracts.filter((c) => c.buyer_id !== id);
    store.buyers = store.buyers.filter((b) => b.id !== id);
    return;
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("leads").update({ buyer_id: null }).eq("buyer_id", id);
  await supabase.from("contracts").delete().eq("buyer_id", id);
  const { error } = await supabase.from("buyers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function crmGetBuyerRow(id: string): Promise<BuyerRow | null> {
  if (isDemoMode()) {
    return getDemoStore().buyers.find((b) => b.id === id) ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("buyers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as BuyerRow) ?? null;
}

export async function crmGetLeadRow(id: string): Promise<LeadRow | null> {
  if (isDemoMode()) {
    return getDemoStore().leads.find((l) => l.id === id) ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as LeadRow) ?? null;
}

export async function crmInsertContract(input: {
  leadId: string;
  buyerId: string;
}): Promise<{ id: string }> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const now = new Date().toISOString();
    const row: ContractRow = {
      id: newId("contract"),
      lead_id: input.leadId,
      buyer_id: input.buyerId,
      status: "verstuurd",
      sent_at: now,
      created_at: now,
      updated_at: now,
    };
    store.contracts.unshift(row);
    return { id: row.id };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      lead_id: input.leadId,
      buyer_id: input.buyerId,
      status: "verstuurd",
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Contract mislukt");
  return { id: data.id as string };
}

export type CrmStats = {
  totalLeads: number;
  deals: number;
  nieuw: number;
  buyers: number;
  photoCount: number;
  winst: number;
  conversie: number;
  byStatus: Record<string, number>;
  dealLeads: {
    marge: number | null;
    naam: string;
    merk: string;
    model: string | null;
    inkoopprijs: number | null;
  }[];
};

export async function crmStats(): Promise<CrmStats> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const totalLeads = store.leads.length;
    const dealLeads = store.leads.filter((l) => l.status === "deal");
    const deals = dealLeads.length;
    const winst = dealLeads.reduce((s, l) => s + (l.marge || 0), 0);
    const byStatus: Record<string, number> = {};
    for (const l of store.leads) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    }
    return {
      totalLeads,
      deals,
      nieuw: store.leads.filter((l) => l.status === "nieuw").length,
      buyers: store.buyers.length,
      photoCount: store.photos.length,
      winst,
      conversie:
        totalLeads === 0 ? 0 : Math.round((deals / totalLeads) * 1000) / 10,
      byStatus,
      dealLeads: dealLeads.map((l) => ({
        marge: l.marge,
        naam: l.naam,
        merk: l.merk,
        model: l.model,
        inkoopprijs: l.inkoopprijs,
      })),
    };
  }

  const supabase = getSupabaseAdmin();
  const [
    { count: totalLeads },
    { count: deals },
    { data: dealRows },
    { data: statusRows },
    { count: nieuw },
    { count: buyers },
    { count: photoCount },
    { data: dealLeads },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "deal"),
    supabase.from("leads").select("marge").eq("status", "deal"),
    supabase.from("leads").select("status"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "nieuw"),
    supabase.from("buyers").select("*", { count: "exact", head: true }),
    supabase.from("lead_photos").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("marge, naam, merk, model, inkoopprijs")
      .eq("status", "deal"),
  ]);

  const total = totalLeads ?? 0;
  const dealCount = deals ?? 0;
  const winst = (dealRows ?? []).reduce(
    (sum, l) => sum + (Number(l.marge) || 0),
    0,
  );
  const byStatus: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    const s = String(row.status);
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  return {
    totalLeads: total,
    deals: dealCount,
    nieuw: nieuw ?? 0,
    buyers: buyers ?? 0,
    photoCount: photoCount ?? 0,
    winst,
    conversie: total === 0 ? 0 : Math.round((dealCount / total) * 1000) / 10,
    byStatus,
    dealLeads: (dealLeads ?? []).map((l) => ({
      marge: l.marge as number | null,
      naam: l.naam as string,
      merk: l.merk as string,
      model: l.model as string | null,
      inkoopprijs: l.inkoopprijs as number | null,
    })),
  };
}
