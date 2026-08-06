import { dealerSiteUrl } from "./dealer-auth";
import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { getSupabaseAdmin } from "./supabase";

export type LeadSelectionRow = {
  id: string;
  slug: string;
  naam: string;
  lead_ids: string[];
  buyer_id: string | null;
  recipient_email: string | null;
  recipient_naam: string | null;
  created_by_user_id?: string | null;
  created_by_naam?: string | null;
  view_count?: number;
  first_viewed_at?: string | null;
  last_viewed_at?: string | null;
  created_at: string;
};

export type LeadSelection = {
  id: string;
  slug: string;
  naam: string;
  leadIds: string[];
  buyerId: string | null;
  recipientEmail: string | null;
  recipientNaam: string | null;
  createdByUserId: string | null;
  createdByNaam: string | null;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  createdAt: string;
  publicUrl: string;
};

export type LeadSelectionAdmin = LeadSelection & {
  buyerBedrijf: string | null;
  buyerNaam: string | null;
};

function mapSelection(row: LeadSelectionRow): LeadSelection {
  return {
    id: row.id,
    slug: row.slug,
    naam: row.naam,
    leadIds: row.lead_ids ?? [],
    buyerId: row.buyer_id ?? null,
    recipientEmail: row.recipient_email ?? null,
    recipientNaam: row.recipient_naam ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    createdByNaam: row.created_by_naam ?? null,
    viewCount: Number(row.view_count ?? 0),
    firstViewedAt: row.first_viewed_at ?? null,
    lastViewedAt: row.last_viewed_at ?? null,
    createdAt: row.created_at,
    publicUrl: `/selectie/${row.slug}`,
  };
}

function makeSlug(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `s-${Date.now().toString(36)}-${rand}`;
}

export function selectionPublicUrl(slug: string): string {
  return `${dealerSiteUrl()}/selectie/${encodeURIComponent(slug)}`;
}

export async function crmCreateSelection(input: {
  naam: string;
  leadIds: string[];
  buyerId?: string | null;
  recipientEmail?: string | null;
  recipientNaam?: string | null;
  createdByUserId?: string | null;
  createdByNaam?: string | null;
}): Promise<LeadSelection> {
  const naam = input.naam.trim();
  const leadIds = [
    ...new Set(input.leadIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (!naam) throw new Error("Selectienaam is verplicht");
  if (leadIds.length === 0) throw new Error("Selecteer minstens één heftruck");

  const now = new Date().toISOString();
  const row: LeadSelectionRow = {
    id: newId("sel"),
    slug: makeSlug(),
    naam,
    lead_ids: leadIds,
    buyer_id: input.buyerId?.trim() || null,
    recipient_email: input.recipientEmail?.trim().toLowerCase() || null,
    recipient_naam: input.recipientNaam?.trim() || null,
    created_by_user_id: input.createdByUserId?.trim() || null,
    created_by_naam: input.createdByNaam?.trim() || null,
    view_count: 0,
    first_viewed_at: null,
    last_viewed_at: null,
    created_at: now,
  };

  if (isDemoMode()) {
    getDemoStore().selections.unshift(row);
    return mapSelection(row);
  }

  const supabase = getSupabaseAdmin();
  const insertFull = {
    id: row.id,
    slug: row.slug,
    naam: row.naam,
    lead_ids: row.lead_ids,
    buyer_id: row.buyer_id,
    recipient_email: row.recipient_email,
    recipient_naam: row.recipient_naam,
    created_by_user_id: row.created_by_user_id,
    created_by_naam: row.created_by_naam,
    view_count: 0,
    created_at: row.created_at,
  };

  let { data, error } = await supabase
    .from("lead_selections")
    .insert(insertFull)
    .select("*")
    .single();

  if (
    error &&
    /created_by|view_count|schema cache|does not exist/i.test(error.message)
  ) {
    const retry = await supabase
      .from("lead_selections")
      .insert({
        id: row.id,
        slug: row.slug,
        naam: row.naam,
        lead_ids: row.lead_ids,
        buyer_id: row.buyer_id,
        recipient_email: row.recipient_email,
        recipient_naam: row.recipient_naam,
        created_at: row.created_at,
      })
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Selectie opslaan mislukt");
  }
  return mapSelection(data as LeadSelectionRow);
}

export async function crmGetSelectionBySlug(
  slug: string,
): Promise<LeadSelection | null> {
  const s = slug.trim();
  if (!s) return null;

  if (isDemoMode()) {
    const row = getDemoStore().selections.find((x) => x.slug === s);
    return row ? mapSelection(row as LeadSelectionRow) : null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_selections")
    .select("*")
    .eq("slug", s)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSelection(data as LeadSelectionRow);
}

/** Tel een pageview (ontvanger). Idempotent genoeg voor CRM-doeleinden. */
export async function crmRecordSelectionView(slug: string): Promise<void> {
  const s = slug.trim();
  if (!s) return;
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const row = getDemoStore().selections.find((x) => x.slug === s) as
      | LeadSelectionRow
      | undefined;
    if (!row) return;
    row.view_count = Number(row.view_count ?? 0) + 1;
    if (!row.first_viewed_at) row.first_viewed_at = now;
    row.last_viewed_at = now;
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_selections")
    .select("id, view_count, first_viewed_at")
    .eq("slug", s)
    .maybeSingle();

  if (error) {
    if (/view_count|first_viewed|schema cache|does not exist/i.test(error.message)) {
      return;
    }
    throw new Error(error.message);
  }
  if (!data) return;

  const current = Number((data as { view_count?: number }).view_count ?? 0);
  const first = (data as { first_viewed_at?: string | null }).first_viewed_at;
  const { error: upErr } = await supabase
    .from("lead_selections")
    .update({
      view_count: current + 1,
      first_viewed_at: first || now,
      last_viewed_at: now,
    })
    .eq("id", (data as { id: string }).id);

  if (upErr) {
    if (/view_count|first_viewed|schema cache|does not exist/i.test(upErr.message)) {
      return;
    }
    throw new Error(upErr.message);
  }
}

export async function crmListSelectionsAdmin(): Promise<LeadSelectionAdmin[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    return store.selections
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((s) => {
        const row = s as LeadSelectionRow;
        const buyer = row.buyer_id
          ? store.buyers.find((b) => b.id === row.buyer_id)
          : null;
        return {
          ...mapSelection(row),
          buyerBedrijf: buyer?.bedrijf ?? null,
          buyerNaam: buyer?.naam ?? null,
        };
      });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_selections")
    .select(
      "*, buyer:buyers(id, naam, bedrijf)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (/lead_selections|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    // Fallback zonder join als buyer kolom ontbreekt in oude schema-cache
    const plain = await supabase
      .from("lead_selections")
      .select("*")
      .order("created_at", { ascending: false });
    if (plain.error) {
      if (/lead_selections|schema cache|does not exist/i.test(plain.error.message)) {
        return [];
      }
      throw new Error(plain.error.message);
    }
    return ((plain.data ?? []) as LeadSelectionRow[]).map((row) => ({
      ...mapSelection(row),
      buyerBedrijf: null,
      buyerNaam: null,
    }));
  }

  type RowWithBuyer = LeadSelectionRow & {
    buyer?: { id: string; naam: string; bedrijf: string } | null;
  };

  return ((data ?? []) as RowWithBuyer[]).map((row) => ({
    ...mapSelection(row),
    buyerBedrijf: row.buyer?.bedrijf ?? null,
    buyerNaam: row.buyer?.naam ?? null,
  }));
}

export async function crmListSelectionsForBuyer(input: {
  buyerId: string;
  email?: string | null;
}): Promise<LeadSelection[]> {
  const buyerId = input.buyerId.trim();
  const email = (input.email ?? "").trim().toLowerCase();
  if (!buyerId && !email) return [];

  if (isDemoMode()) {
    return getDemoStore()
      .selections.filter((s) => {
        const row = s as LeadSelectionRow;
        if (buyerId && row.buyer_id === buyerId) return true;
        if (
          email &&
          row.recipient_email &&
          row.recipient_email.toLowerCase() === email
        ) {
          return true;
        }
        return false;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((s) => mapSelection(s as LeadSelectionRow));
  }

  const supabase = getSupabaseAdmin();
  const byId = await supabase
    .from("lead_selections")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (byId.error) {
    if (
      /buyer_id|recipient_email|schema cache|does not exist/i.test(
        byId.error.message,
      )
    ) {
      return [];
    }
    throw new Error(byId.error.message);
  }

  const rows = new Map<string, LeadSelectionRow>();
  for (const row of (byId.data ?? []) as LeadSelectionRow[]) {
    rows.set(row.id, row);
  }

  if (email) {
    const byEmail = await supabase
      .from("lead_selections")
      .select("*")
      .eq("recipient_email", email)
      .order("created_at", { ascending: false });
    if (!byEmail.error) {
      for (const row of (byEmail.data ?? []) as LeadSelectionRow[]) {
        rows.set(row.id, row);
      }
    }
  }

  return [...rows.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(mapSelection);
}
