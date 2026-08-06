import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { getSupabaseAdmin } from "./supabase";

export type LeadBidRow = {
  id: string;
  lead_id: string;
  selection_id: string | null;
  buyer_id: string | null;
  bidder_naam: string;
  bidder_email: string;
  bidder_telefoon: string | null;
  bidder_bedrijf: string | null;
  bedrag: number;
  created_at: string;
};

export type LeadHighestBid = {
  leadId: string;
  bedrag: number;
  bidderLabel: string;
  bidderEmail: string;
  createdAt: string;
};

export type LeadBid = {
  id: string;
  leadId: string;
  selectionId: string | null;
  buyerId: string | null;
  bidderNaam: string;
  bidderEmail: string;
  bidderTelefoon: string | null;
  bidderBedrijf: string | null;
  bedrag: number;
  createdAt: string;
};

function mapBid(row: LeadBidRow): LeadBid {
  return {
    id: row.id,
    leadId: row.lead_id,
    selectionId: row.selection_id,
    buyerId: row.buyer_id,
    bidderNaam: row.bidder_naam,
    bidderEmail: row.bidder_email,
    bidderTelefoon: row.bidder_telefoon,
    bidderBedrijf: row.bidder_bedrijf,
    bedrag: row.bedrag,
    createdAt: row.created_at,
  };
}

function bidderLabel(row: Pick<LeadBidRow, "bidder_bedrijf" | "bidder_naam">) {
  return (row.bidder_bedrijf || row.bidder_naam || "").trim() || "Handelaar";
}

export async function crmPlaceLeadBid(input: {
  leadId: string;
  selectionId?: string | null;
  buyerId?: string | null;
  bidderNaam?: string | null;
  bidderEmail?: string | null;
  bidderTelefoon?: string | null;
  bidderBedrijf: string;
  bedrag: number;
}): Promise<LeadBid> {
  const bedrag = Number(input.bedrag);
  if (!Number.isFinite(bedrag) || bedrag <= 0) {
    throw new Error("Bod moet groter dan 0 zijn");
  }
  const bedrijf = input.bidderBedrijf.trim();
  if (!bedrijf) throw new Error("Bedrijfsnaam is verplicht");
  const naam = (input.bidderNaam?.trim() || bedrijf);
  const email = (input.bidderEmail?.trim() || "").toLowerCase();

  const row: LeadBidRow = {
    id: newId("lbid"),
    lead_id: input.leadId,
    selection_id: input.selectionId ?? null,
    buyer_id: input.buyerId ?? null,
    bidder_naam: naam,
    bidder_email: email || `${bedrijf.toLowerCase().replace(/\s+/g, ".")}@selectie.local`,
    bidder_telefoon: input.bidderTelefoon?.trim() || null,
    bidder_bedrijf: bedrijf,
    bedrag,
    created_at: new Date().toISOString(),
  };

  if (isDemoMode()) {
    getDemoStore().leadBids.unshift(row);
    return mapBid(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_bids")
    .insert({
      id: row.id,
      lead_id: row.lead_id,
      selection_id: row.selection_id,
      buyer_id: row.buyer_id,
      bidder_naam: row.bidder_naam,
      bidder_email: row.bidder_email,
      bidder_telefoon: row.bidder_telefoon,
      bidder_bedrijf: row.bidder_bedrijf,
      bedrag: row.bedrag,
      created_at: row.created_at,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Bod opslaan mislukt");
  }
  return mapBid(data as LeadBidRow);
}

/** Hoogste bod per lead_id (lead_bids + marketplace_bids). */
export async function crmHighestBidsByLeadIds(
  leadIds: string[],
): Promise<Map<string, LeadHighestBid>> {
  const ids = [...new Set(leadIds.filter(Boolean))];
  const map = new Map<string, LeadHighestBid>();
  if (ids.length === 0) return map;

  function consider(row: {
    lead_id: string;
    bedrag: number;
    bidder_bedrijf: string | null;
    bidder_naam: string;
    bidder_email: string;
    created_at: string;
  }) {
    const bedrag = Number(row.bedrag);
    if (!Number.isFinite(bedrag)) return;
    const current = map.get(row.lead_id);
    if (current && current.bedrag >= bedrag) return;
    map.set(row.lead_id, {
      leadId: row.lead_id,
      bedrag,
      bidderLabel: bidderLabel(row),
      bidderEmail: row.bidder_email || "",
      createdAt: row.created_at,
    });
  }

  if (isDemoMode()) {
    const store = getDemoStore();
    for (const b of store.leadBids) {
      if (!ids.includes(b.lead_id)) continue;
      consider(b);
    }
    for (const listing of store.listings) {
      if (!listing.lead_id || !ids.includes(listing.lead_id)) continue;
      for (const b of store.bids) {
        if (b.listing_id !== listing.id) continue;
        consider({
          lead_id: listing.lead_id,
          bedrag: b.bedrag,
          bidder_bedrijf: b.bidder_bedrijf,
          bidder_naam: b.bidder_naam,
          bidder_email: b.bidder_email,
          created_at: b.created_at,
        });
      }
    }
    return map;
  }

  const supabase = getSupabaseAdmin();

  const { data: leadBidRows, error: leadBidErr } = await supabase
    .from("lead_bids")
    .select("*")
    .in("lead_id", ids);

  if (leadBidErr) {
    if (!/lead_bids|schema cache|does not exist/i.test(leadBidErr.message)) {
      throw new Error(leadBidErr.message);
    }
  } else {
    for (const row of (leadBidRows ?? []) as LeadBidRow[]) {
      consider(row);
    }
  }

  const { data: listings, error: listErr } = await supabase
    .from("marketplace_listings")
    .select("id, lead_id")
    .in("lead_id", ids);

  if (listErr) {
    if (!/marketplace_listings|schema cache|does not exist/i.test(listErr.message)) {
      throw new Error(listErr.message);
    }
    return map;
  }

  const listingIds = (listings ?? [])
    .map((l) => String(l.id))
    .filter(Boolean);
  if (listingIds.length === 0) return map;

  const leadByListing = new Map<string, string>();
  for (const l of listings ?? []) {
    if (l.id && l.lead_id) leadByListing.set(String(l.id), String(l.lead_id));
  }

  const { data: mpBids, error: mpErr } = await supabase
    .from("marketplace_bids")
    .select("*")
    .in("listing_id", listingIds);

  if (mpErr) {
    if (!/marketplace_bids|schema cache|does not exist/i.test(mpErr.message)) {
      throw new Error(mpErr.message);
    }
    return map;
  }

  for (const b of mpBids ?? []) {
    const leadId = leadByListing.get(String(b.listing_id));
    if (!leadId) continue;
    consider({
      lead_id: leadId,
      bedrag: Number(b.bedrag),
      bidder_bedrijf: b.bidder_bedrijf == null ? null : String(b.bidder_bedrijf),
      bidder_naam: String(b.bidder_naam ?? ""),
      bidder_email: String(b.bidder_email ?? ""),
      created_at: String(b.created_at ?? ""),
    });
  }

  return map;
}

export async function crmListLeadBids(leadId: string): Promise<LeadBid[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const fromLead = store.leadBids
      .filter((b) => b.lead_id === leadId)
      .map(mapBid);
    const listingIds = store.listings
      .filter((l) => l.lead_id === leadId)
      .map((l) => l.id);
    const fromMp = store.bids
      .filter((b) => listingIds.includes(b.listing_id))
      .map((b) =>
        mapBid({
          id: b.id,
          lead_id: leadId,
          selection_id: null,
          buyer_id: null,
          bidder_naam: b.bidder_naam,
          bidder_email: b.bidder_email,
          bidder_telefoon: b.bidder_telefoon,
          bidder_bedrijf: b.bidder_bedrijf,
          bedrag: b.bedrag,
          created_at: b.created_at,
        }),
      );
    return [...fromLead, ...fromMp].sort(
      (a, b) => b.bedrag - a.bedrag || b.createdAt.localeCompare(a.createdAt),
    );
  }

  const supabase = getSupabaseAdmin();
  const bids: LeadBid[] = [];

  const { data, error } = await supabase
    .from("lead_bids")
    .select("*")
    .eq("lead_id", leadId)
    .order("bedrag", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (!/lead_bids|schema cache|does not exist/i.test(error.message)) {
      throw new Error(error.message);
    }
  } else {
    bids.push(...((data ?? []) as LeadBidRow[]).map(mapBid));
  }

  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("lead_id", leadId);

  const listingIds = (listings ?? []).map((l) => String(l.id)).filter(Boolean);
  if (listingIds.length > 0) {
    const { data: mpBids, error: mpErr } = await supabase
      .from("marketplace_bids")
      .select("*")
      .in("listing_id", listingIds)
      .order("bedrag", { ascending: false });

    if (mpErr) {
      if (!/marketplace_bids|schema cache|does not exist/i.test(mpErr.message)) {
        throw new Error(mpErr.message);
      }
    } else {
      for (const b of mpBids ?? []) {
        bids.push(
          mapBid({
            id: String(b.id),
            lead_id: leadId,
            selection_id: null,
            buyer_id: null,
            bidder_naam: String(b.bidder_naam ?? ""),
            bidder_email: String(b.bidder_email ?? ""),
            bidder_telefoon:
              b.bidder_telefoon == null ? null : String(b.bidder_telefoon),
            bidder_bedrijf:
              b.bidder_bedrijf == null ? null : String(b.bidder_bedrijf),
            bedrag: Number(b.bedrag),
            created_at: String(b.created_at ?? ""),
          }),
        );
      }
    }
  }

  return bids.sort(
    (a, b) => b.bedrag - a.bedrag || b.createdAt.localeCompare(a.createdAt),
  );
}

export type BuyerBid = LeadBid & {
  leadMerk: string;
  leadModel: string | null;
  leadNaam: string;
};

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function bidMatchesBuyer(
  bid: LeadBidRow,
  input: {
    buyerId: string;
    emails: string[];
    bedrijfKey: string | null;
  },
): boolean {
  if (bid.buyer_id === input.buyerId) return true;
  const email = (bid.bidder_email || "").trim().toLowerCase();
  if (email && input.emails.includes(email)) return true;
  if (input.bedrijfKey) {
    const bedrijf = normalizeMatch(bid.bidder_bedrijf || bid.bidder_naam || "");
    if (bedrijf && bedrijf === input.bedrijfKey) return true;
  }
  return false;
}

async function enrichBidsWithLeads(bids: LeadBid[]): Promise<BuyerBid[]> {
  if (bids.length === 0) return [];
  const leadIds = [...new Set(bids.map((b) => b.leadId))];
  const leadMap = new Map<
    string,
    { merk: string; model: string | null; naam: string }
  >();

  if (isDemoMode()) {
    for (const lead of getDemoStore().leads) {
      if (leadIds.includes(lead.id)) {
        leadMap.set(lead.id, {
          merk: lead.merk,
          model: lead.model,
          naam: lead.naam,
        });
      }
    }
  } else {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .select("id, merk, model, naam")
      .in("id", leadIds);
    if (error) {
      if (!/schema cache|does not exist/i.test(error.message)) {
        throw new Error(error.message);
      }
    } else {
      for (const row of data ?? []) {
        leadMap.set(String(row.id), {
          merk: String(row.merk ?? ""),
          model: row.model == null ? null : String(row.model),
          naam: String(row.naam ?? ""),
        });
      }
    }
  }

  return bids.map((b) => {
    const lead = leadMap.get(b.leadId);
    return {
      ...b,
      leadMerk: lead?.merk ?? "—",
      leadModel: lead?.model ?? null,
      leadNaam: lead?.naam ?? "—",
    };
  });
}

/** Alle biedingen van een koper/handelaar (buyer_id, e-mail of bedrijfsnaam). */
export async function crmListBidsForBuyer(input: {
  buyerId: string;
  email?: string | null;
  dealerUsername?: string | null;
  bedrijf?: string | null;
}): Promise<BuyerBid[]> {
  const emails = [
    ...new Set(
      [input.email, input.dealerUsername]
        .map((v) => (v || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const bedrijfKey = input.bedrijf ? normalizeMatch(input.bedrijf) : null;
  const matchInput = { buyerId: input.buyerId, emails, bedrijfKey };

  let rows: LeadBidRow[] = [];

  if (isDemoMode()) {
    rows = getDemoStore().leadBids.filter((b) =>
      bidMatchesBuyer(b, matchInput),
    );
  } else {
    const supabase = getSupabaseAdmin();
    const collected = new Map<string, LeadBidRow>();

    const merge = (list: LeadBidRow[] | null | undefined) => {
      for (const row of list ?? []) collected.set(row.id, row);
    };

    const byBuyer = await supabase
      .from("lead_bids")
      .select("*")
      .eq("buyer_id", input.buyerId)
      .order("created_at", { ascending: false });

    if (byBuyer.error) {
      if (/lead_bids|schema cache|does not exist/i.test(byBuyer.error.message)) {
        return [];
      }
      throw new Error(byBuyer.error.message);
    }
    merge(byBuyer.data as LeadBidRow[]);

    if (emails.length > 0) {
      const byEmail = await supabase
        .from("lead_bids")
        .select("*")
        .in("bidder_email", emails)
        .order("created_at", { ascending: false });
      if (byEmail.error) {
        throw new Error(byEmail.error.message);
      }
      merge(byEmail.data as LeadBidRow[]);
    }

    if (bedrijfKey) {
      const byBedrijf = await supabase
        .from("lead_bids")
        .select("*")
        .ilike("bidder_bedrijf", input.bedrijf!.trim())
        .order("created_at", { ascending: false });
      if (!byBedrijf.error) {
        merge(byBedrijf.data as LeadBidRow[]);
      }
    }

    rows = [...collected.values()].filter((b) =>
      bidMatchesBuyer(b, matchInput),
    );
  }

  const bids = rows
    .sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.bedrag - a.bedrag,
    )
    .map(mapBid);

  return enrichBidsWithLeads(bids);
}

/** Alle biedingen gekoppeld aan een selectie (of op leads van die selectie). */
export async function crmListBidsForSelection(input: {
  selectionId: string;
  leadIds: string[];
}): Promise<LeadBid[]> {
  const leadIds = [...new Set(input.leadIds.filter(Boolean))];
  if (leadIds.length === 0) return [];

  if (isDemoMode()) {
    return getDemoStore()
      .leadBids.filter(
        (b) =>
          b.selection_id === input.selectionId || leadIds.includes(b.lead_id),
      )
      .sort(
        (a, b) =>
          b.bedrag - a.bedrag || b.created_at.localeCompare(a.created_at),
      )
      .map(mapBid);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_bids")
    .select("*")
    .in("lead_id", leadIds)
    .order("bedrag", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (/lead_bids|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  // Prefer bids for this selection; keep others on same leads as fallback
  const rows = (data ?? []) as LeadBidRow[];
  const forSelection = rows.filter((r) => r.selection_id === input.selectionId);
  return (forSelection.length > 0 ? forSelection : rows).map(mapBid);
}
