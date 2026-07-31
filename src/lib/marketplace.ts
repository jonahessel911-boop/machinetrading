import { randomBytes } from "node:crypto";
import type { LeadPhoto } from "./mappers";

export type MarketplaceListingRow = {
  id: string;
  lead_id: string;
  slug: string;
  omschrijving: string | null;
  woonplaats: string;
  merk: string;
  model: string | null;
  status: "actief" | "verlopen" | "ingetrokken" | string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type MarketplaceBidRow = {
  id: string;
  listing_id: string;
  bidder_naam: string;
  bidder_email: string;
  bidder_telefoon: string | null;
  bidder_bedrijf: string | null;
  bedrag: number;
  created_at: string;
};

export type MarketplaceShareRow = {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  email: string;
  sent_at: string;
};

export type MarketplaceListing = {
  id: string;
  leadId: string;
  slug: string;
  omschrijving: string | null;
  woonplaats: string;
  merk: string;
  model: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
  photos?: LeadPhoto[];
  bidCount?: number;
  highestBid?: number | null;
  bids?: MarketplaceBid[];
  isLive?: boolean;
  publicUrl?: string;
};

export type MarketplaceBid = {
  id: string;
  listingId: string;
  bidderNaam: string;
  bidderEmail: string;
  bidderTelefoon: string | null;
  bidderBedrijf: string | null;
  bedrag: number;
  createdAt: string;
};

export const AUCTION_DAYS = 7;

export function makeListingSlug(): string {
  return randomBytes(6).toString("hex");
}

export function auctionEndsAt(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + AUCTION_DAYS);
  return d.toISOString();
}

export function isListingLive(
  listing: Pick<MarketplaceListingRow, "status" | "ends_at">,
  now = new Date(),
): boolean {
  return (
    listing.status === "actief" && new Date(listing.ends_at).getTime() > now.getTime()
  );
}

export function mapBid(row: MarketplaceBidRow): MarketplaceBid {
  return {
    id: row.id,
    listingId: row.listing_id,
    bidderNaam: row.bidder_naam,
    bidderEmail: row.bidder_email,
    bidderTelefoon: row.bidder_telefoon,
    bidderBedrijf: row.bidder_bedrijf,
    bedrag: row.bedrag,
    createdAt: row.created_at,
  };
}

export function mapListing(
  row: MarketplaceListingRow,
  extra?: {
    photos?: LeadPhoto[];
    bids?: MarketplaceBid[];
    bidCount?: number;
    highestBid?: number | null;
  },
): MarketplaceListing {
  const live = isListingLive(row);
  return {
    id: row.id,
    leadId: row.lead_id,
    slug: row.slug,
    omschrijving: row.omschrijving,
    woonplaats: row.woonplaats,
    merk: row.merk,
    model: row.model,
    status: live ? row.status : row.status === "actief" ? "verlopen" : row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: extra?.photos,
    bids: extra?.bids,
    bidCount: extra?.bidCount ?? extra?.bids?.length ?? 0,
    highestBid:
      extra?.highestBid ??
      (extra?.bids?.length
        ? Math.max(...extra.bids.map((b) => b.bedrag))
        : null),
    isLive: live,
    publicUrl: `/marketplace/${row.slug}`,
  };
}

export function listingTitle(listing: {
  merk: string;
  model?: string | null;
}): string {
  return [listing.merk, listing.model].filter(Boolean).join(" ");
}

/**
 * Verwijdert gevoelige velden voor niet-ingelogde bezoekers
 * (voorkomt lekken via HTML/JSON).
 */
export function sanitizeListingForGuest(
  listing: MarketplaceListing,
): MarketplaceListing {
  return {
    ...listing,
    omschrijving: null,
    highestBid: null,
    bids: [],
    bidCount: 0,
  };
}

export function sanitizeListingsForGuest(
  listings: MarketplaceListing[],
): MarketplaceListing[] {
  return listings.map(sanitizeListingForGuest);
}

