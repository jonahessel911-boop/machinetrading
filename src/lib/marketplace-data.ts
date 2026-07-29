import { mapPhoto, type LeadPhotoRow } from "./mappers";
import {
  getDemoStore,
  isDemoMode,
  newId,
} from "./demo-store";
import {
  auctionEndsAt,
  isListingLive,
  mapBid,
  mapListing,
  makeListingSlug,
  type MarketplaceBidRow,
  type MarketplaceListing,
  type MarketplaceListingRow,
  type MarketplaceShareRow,
} from "./marketplace";
import { getSupabaseAdmin } from "./supabase";

function expireStale(listings: MarketplaceListingRow[]): void {
  const now = Date.now();
  for (const l of listings) {
    if (l.status === "actief" && new Date(l.ends_at).getTime() <= now) {
      l.status = "verlopen";
      l.updated_at = new Date().toISOString();
    }
  }
}

async function expireStaleSupabase(): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("marketplace_listings")
    .update({ status: "verlopen", updated_at: new Date().toISOString() })
    .eq("status", "actief")
    .lt("ends_at", new Date().toISOString());
}

function photosForLead(leadId: string) {
  return getDemoStore()
    .photos.filter((p) => p.lead_id === leadId)
    .map(mapPhoto);
}

function enrichDemo(listing: MarketplaceListingRow): MarketplaceListing {
  const store = getDemoStore();
  const bids = store.bids
    .filter((b) => b.listing_id === listing.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map(mapBid);
  return mapListing(listing, {
    photos: photosForLead(listing.lead_id),
    bids,
    bidCount: bids.length,
    highestBid: bids.length ? Math.max(...bids.map((b) => b.bedrag)) : null,
  });
}

export async function mpListPublic(): Promise<MarketplaceListing[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    expireStale(store.listings);
    return store.listings
      .filter((l) => isListingLive(l))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map(enrichDemo);
  }

  await expireStaleSupabase();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("status", "actief")
    .gt("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const listings = (data ?? []) as MarketplaceListingRow[];
  return Promise.all(listings.map((row) => mpHydrateListing(row)));
}

export async function mpListAllAdmin(): Promise<MarketplaceListing[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    expireStale(store.listings);
    return store.listings
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map(enrichDemo);
  }

  await expireStaleSupabase();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all(
    ((data ?? []) as MarketplaceListingRow[]).map((row) =>
      mpHydrateListing(row),
    ),
  );
}

async function mpHydrateListing(
  row: MarketplaceListingRow,
): Promise<MarketplaceListing> {
  if (isDemoMode()) return enrichDemo(row);

  const supabase = getSupabaseAdmin();
  const [{ data: photos }, { data: bids }] = await Promise.all([
    supabase
      .from("lead_photos")
      .select("*")
      .eq("lead_id", row.lead_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("marketplace_bids")
      .select("*")
      .eq("listing_id", row.id)
      .order("bedrag", { ascending: false }),
  ]);

  const bidRows = (bids ?? []) as MarketplaceBidRow[];
  const mappedBids = bidRows.map(mapBid);
  return mapListing(row, {
    photos: ((photos ?? []) as LeadPhotoRow[]).map(mapPhoto),
    bids: mappedBids,
    bidCount: mappedBids.length,
    highestBid: mappedBids[0]?.bedrag ?? null,
  });
}

export async function mpGetBySlug(
  slug: string,
  opts?: { includeExpired?: boolean },
): Promise<MarketplaceListing | null> {
  if (isDemoMode()) {
    const store = getDemoStore();
    expireStale(store.listings);
    const row = store.listings.find((l) => l.slug === slug);
    if (!row) return null;
    if (!opts?.includeExpired && !isListingLive(row)) return null;
    return enrichDemo(row);
  }

  await expireStaleSupabase();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as MarketplaceListingRow;
  if (!opts?.includeExpired && !isListingLive(row)) return null;
  return mpHydrateListing(row);
}

export async function mpGetByLeadId(
  leadId: string,
): Promise<MarketplaceListing | null> {
  if (isDemoMode()) {
    const store = getDemoStore();
    expireStale(store.listings);
    const row = store.listings
      .filter((l) => l.lead_id === leadId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
    return row ? enrichDemo(row) : null;
  }

  await expireStaleSupabase();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mpHydrateListing(data as MarketplaceListingRow);
}

export async function mpPublishLead(input: {
  leadId: string;
  omschrijving?: string | null;
}): Promise<MarketplaceListing> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const lead = store.leads.find((l) => l.id === input.leadId);
    if (!lead) throw new Error("Lead niet gevonden");

    // Expire any existing active listing for this lead
    for (const l of store.listings) {
      if (l.lead_id === lead.id && l.status === "actief") {
        l.status = "ingetrokken";
        l.updated_at = new Date().toISOString();
      }
    }

    const now = new Date().toISOString();
    const row: MarketplaceListingRow = {
      id: newId("listing"),
      lead_id: lead.id,
      slug: makeListingSlug(),
      omschrijving: input.omschrijving?.trim() || null,
      woonplaats: lead.woonplaats,
      merk: lead.merk,
      model: lead.model,
      status: "actief",
      starts_at: now,
      ends_at: auctionEndsAt(new Date(now)),
      created_at: now,
      updated_at: now,
    };
    store.listings.unshift(row);
    return enrichDemo(row);
  }

  const supabase = getSupabaseAdmin();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", input.leadId)
    .maybeSingle();
  if (leadError || !lead) throw new Error("Lead niet gevonden");

  await supabase
    .from("marketplace_listings")
    .update({ status: "ingetrokken", updated_at: new Date().toISOString() })
    .eq("lead_id", input.leadId)
    .eq("status", "actief");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({
      lead_id: input.leadId,
      slug: makeListingSlug(),
      omschrijving: input.omschrijving?.trim() || null,
      woonplaats: lead.woonplaats,
      merk: lead.merk,
      model: lead.model,
      status: "actief",
      starts_at: now,
      ends_at: auctionEndsAt(new Date(now)),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Publiceren mislukt");
  return mpHydrateListing(data as MarketplaceListingRow);
}

export async function mpRepublish(listingId: string): Promise<MarketplaceListing> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const row = store.listings.find((l) => l.id === listingId);
    if (!row) throw new Error("Listing niet gevonden");
    const now = new Date().toISOString();
    row.status = "actief";
    row.starts_at = now;
    row.ends_at = auctionEndsAt(new Date(now));
    row.updated_at = now;
    return enrichDemo(row);
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .update({
      status: "actief",
      starts_at: now,
      ends_at: auctionEndsAt(new Date(now)),
      updated_at: now,
    })
    .eq("id", listingId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Hernieuwen mislukt");
  return mpHydrateListing(data as MarketplaceListingRow);
}

export async function mpUnpublish(listingId: string): Promise<MarketplaceListing> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const row = store.listings.find((l) => l.id === listingId);
    if (!row) throw new Error("Listing niet gevonden");
    row.status = "ingetrokken";
    row.updated_at = new Date().toISOString();
    return enrichDemo(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .update({
      status: "ingetrokken",
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Intrekken mislukt");
  return mpHydrateListing(data as MarketplaceListingRow);
}

/** Trek alle actieve veilingen voor een lead in (na koopovereenkomst). */
export async function mpUnpublishForLead(leadId: string): Promise<number> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const now = new Date().toISOString();
    let count = 0;
    for (const l of store.listings) {
      if (l.lead_id === leadId && l.status === "actief") {
        l.status = "ingetrokken";
        l.updated_at = now;
        count += 1;
      }
    }
    return count;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .update({
      status: "ingetrokken",
      updated_at: new Date().toISOString(),
    })
    .eq("lead_id", leadId)
    .eq("status", "actief")
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function mpPlaceBid(input: {
  slug: string;
  bidderNaam: string;
  bidderEmail: string;
  bidderTelefoon?: string | null;
  bidderBedrijf?: string | null;
  bedrag: number;
}): Promise<MarketplaceListing> {
  if (input.bedrag <= 0) throw new Error("Bod moet groter dan 0 zijn");

  if (isDemoMode()) {
    const store = getDemoStore();
    expireStale(store.listings);
    const listing = store.listings.find((l) => l.slug === input.slug);
    if (!listing || !isListingLive(listing)) {
      throw new Error("Deze veiling is niet meer actief");
    }
    const highest = store.bids
      .filter((b) => b.listing_id === listing.id)
      .reduce((max, b) => Math.max(max, b.bedrag), 0);
    if (highest > 0 && input.bedrag <= highest) {
      throw new Error(`Bod moet hoger zijn dan €${highest.toLocaleString("nl-NL")}`);
    }
    const bid: MarketplaceBidRow = {
      id: newId("bid"),
      listing_id: listing.id,
      bidder_naam: input.bidderNaam.trim(),
      bidder_email: input.bidderEmail.trim(),
      bidder_telefoon: input.bidderTelefoon?.trim() || null,
      bidder_bedrijf: input.bidderBedrijf?.trim() || null,
      bedrag: input.bedrag,
      created_at: new Date().toISOString(),
    };
    store.bids.unshift(bid);
    return enrichDemo(listing);
  }

  await expireStaleSupabase();
  const supabase = getSupabaseAdmin();
  const { data: listing, error: listError } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("slug", input.slug)
    .maybeSingle();
  if (listError || !listing) throw new Error("Listing niet gevonden");
  const row = listing as MarketplaceListingRow;
  if (!isListingLive(row)) throw new Error("Deze veiling is niet meer actief");

  const { data: top } = await supabase
    .from("marketplace_bids")
    .select("bedrag")
    .eq("listing_id", row.id)
    .order("bedrag", { ascending: false })
    .limit(1)
    .maybeSingle();
  const highest = Number(top?.bedrag ?? 0);
  if (highest > 0 && input.bedrag <= highest) {
    throw new Error(`Bod moet hoger zijn dan €${highest.toLocaleString("nl-NL")}`);
  }

  const { error: bidError } = await supabase.from("marketplace_bids").insert({
    listing_id: row.id,
    bidder_naam: input.bidderNaam.trim(),
    bidder_email: input.bidderEmail.trim(),
    bidder_telefoon: input.bidderTelefoon?.trim() || null,
    bidder_bedrijf: input.bidderBedrijf?.trim() || null,
    bedrag: input.bedrag,
  });
  if (bidError) throw new Error(bidError.message);
  return mpHydrateListing(row);
}

export async function mpRecordShare(input: {
  listingId: string;
  email: string;
  buyerId?: string | null;
}): Promise<void> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const share: MarketplaceShareRow = {
      id: newId("share"),
      listing_id: input.listingId,
      buyer_id: input.buyerId ?? null,
      email: input.email,
      sent_at: new Date().toISOString(),
    };
    store.shares.unshift(share);
    return;
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("marketplace_shares").insert({
    listing_id: input.listingId,
    buyer_id: input.buyerId ?? null,
    email: input.email,
  });
}

export async function mpTopBuyers(limit = 10): Promise<
  {
    id: string;
    naam: string;
    email: string | null;
    telefoon: string | null;
    bedrijf: string;
    leadCount: number;
  }[]
> {
  if (isDemoMode()) {
    const store = getDemoStore();
    return store.buyers
      .map((b) => ({
        id: b.id,
        naam: b.naam,
        email: b.email,
        telefoon: b.telefoon,
        bedrijf: b.bedrijf,
        leadCount: store.leads.filter((l) => l.buyer_id === b.id).length,
      }))
      .sort((a, b) => b.leadCount - a.leadCount || a.bedrijf.localeCompare(b.bedrijf))
      .slice(0, limit);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .select("*, leads(count)")
    .order("bedrijf", { ascending: true });
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    id: string;
    naam: string;
    email: string | null;
    telefoon: string | null;
    bedrijf: string;
    leads?: { count: number }[];
  }>)
    .map((b) => ({
      id: b.id,
      naam: b.naam,
      email: b.email,
      telefoon: b.telefoon,
      bedrijf: b.bedrijf,
      leadCount: b.leads?.[0]?.count ?? 0,
    }))
    .sort((a, b) => b.leadCount - a.leadCount || a.bedrijf.localeCompare(b.bedrijf))
    .slice(0, limit);
}

export async function mpSearchBuyers(q: string): Promise<
  {
    id: string;
    naam: string;
    email: string | null;
    telefoon: string | null;
    bedrijf: string;
    leadCount: number;
  }[]
> {
  const query = q.trim().toLowerCase();
  if (!query) return mpTopBuyers(10);

  if (isDemoMode()) {
    const store = getDemoStore();
    return store.buyers
      .filter((b) =>
        [b.naam, b.bedrijf, b.email, b.telefoon]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query)),
      )
      .map((b) => ({
        id: b.id,
        naam: b.naam,
        email: b.email,
        telefoon: b.telefoon,
        bedrijf: b.bedrijf,
        leadCount: store.leads.filter((l) => l.buyer_id === b.id).length,
      }))
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, 20);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("buyers")
    .select("*, leads(count)")
    .or(
      `naam.ilike.%${query}%,bedrijf.ilike.%${query}%,email.ilike.%${query}%,telefoon.ilike.%${query}%`,
    )
    .limit(20);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    id: string;
    naam: string;
    email: string | null;
    telefoon: string | null;
    bedrijf: string;
    leads?: { count: number }[];
  }>).map((b) => ({
    id: b.id,
    naam: b.naam,
    email: b.email,
    telefoon: b.telefoon,
    bedrijf: b.bedrijf,
    leadCount: b.leads?.[0]?.count ?? 0,
  }));
}
