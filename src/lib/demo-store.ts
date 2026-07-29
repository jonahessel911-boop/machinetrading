import type {
  BuyerRow,
  ContractRow,
  LeadPhotoRow,
  LeadRow,
} from "./mappers";
import type {
  MarketplaceBidRow,
  MarketplaceListingRow,
  MarketplaceShareRow,
} from "./marketplace";
import { auctionEndsAt, makeListingSlug } from "./marketplace";
import { hashPassword } from "./password";
import { isSupabaseConfigured } from "./supabase";

export type DemoStore = {
  buyers: BuyerRow[];
  leads: LeadRow[];
  photos: LeadPhotoRow[];
  contracts: ContractRow[];
  listings: MarketplaceListingRow[];
  bids: MarketplaceBidRow[];
  shares: MarketplaceShareRow[];
  periodCosts: PeriodCostRow[];
};

export type PeriodCostRow = {
  id: string;
  cost_date: string;
  ad_spend: number;
  sales_cost: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const g = globalThis as unknown as {
  __hvDemoStore?: DemoStore;
  __hvDemoStoreVersion?: number;
};

const DEMO_STORE_VERSION = 5;

function nowIso(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function seed(): DemoStore {
  const dealerPass = hashPassword("dealer123");
  const buyers: BuyerRow[] = [
    {
      id: "buyer-demo-1",
      naam: "Jan de Vries",
      email: "jan@heftruckhandel.nl",
      telefoon: "06-12345678",
      bedrijf: "Heftruck Handel Utrecht BV",
      dealer_username: "jan@heftruckhandel.nl",
      dealer_password_hash: dealerPass,
      dealer_enabled: true,
      created_at: nowIso(40),
      updated_at: nowIso(40),
    },
    {
      id: "buyer-demo-2",
      naam: "Petra Bakker",
      email: "petra@forkliftpro.nl",
      telefoon: "06-87654321",
      bedrijf: "Forklift Pro B.V.",
      dealer_username: "petra@forkliftpro.nl",
      dealer_password_hash: dealerPass,
      dealer_enabled: true,
      created_at: nowIso(30),
      updated_at: nowIso(30),
    },
    {
      id: "buyer-demo-3",
      naam: "Mohamed El Amrani",
      email: "m.elamrani@industech.nl",
      telefoon: "020-5551212",
      bedrijf: "Industech Machines",
      dealer_username: null,
      dealer_password_hash: null,
      dealer_enabled: false,
      created_at: nowIso(20),
      updated_at: nowIso(20),
    },
  ];

  const leads: LeadRow[] = [
    {
      id: "lead-demo-1",
      merk: "Toyota",
      model: "8FBM20",
      timing: "Zo snel mogelijk",
      naam: "Kees Jansen",
      email: "kees.jansen@voorbeeld.nl",
      telefoon: "06-11223344",
      straat: null,
      huisnummer: null,
      toevoeging: null,
      postcode: null,
      woonplaats: "Utrecht",
      status: "nieuw",
      contact_attempts: 0,
      inkoopprijs: null,
      marge: null,
      verkoopprijs: null,
      netto_inkoopprijs: null,
      deal_datum: null,
      buyer_id: null,
      created_at: nowIso(0),
      updated_at: nowIso(0),
    },
    {
      id: "lead-demo-2",
      merk: "Linde",
      model: "H25D",
      timing: "Binnen 2 weken",
      naam: "Sandra Vermeer",
      email: "sandra@logistiek.nl",
      telefoon: "06-99887766",
      straat: "Oranjelaan",
      huisnummer: "6",
      toevoeging: null,
      postcode: "3737AT",
      woonplaats: "Groenekan",
      status: "contact_2",
      contact_attempts: 2,
      inkoopprijs: null,
      marge: null,
      verkoopprijs: null,
      netto_inkoopprijs: null,
      deal_datum: null,
      buyer_id: null,
      created_at: nowIso(1),
      updated_at: nowIso(0),
    },
    {
      id: "lead-demo-3",
      merk: "Still",
      model: "RX60-25",
      timing: "Deze maand",
      naam: "Mark de Boer",
      email: "mark@warehouse.nl",
      telefoon: "06-44556677",
      straat: "Industrieweg",
      huisnummer: "12",
      toevoeging: "A",
      postcode: "3542AD",
      woonplaats: "Utrecht",
      status: "deal",
      contact_attempts: 3,
      inkoopprijs: 9000,
      marge: 1000,
      verkoopprijs: 12500,
      netto_inkoopprijs: 10000,
      deal_datum: nowIso(2).slice(0, 10),
      buyer_id: "buyer-demo-1",
      created_at: nowIso(5),
      updated_at: nowIso(2),
    },
    {
      id: "lead-demo-4",
      merk: "Jungheinrich",
      model: "EFG 320",
      timing: "Geen haast",
      naam: "Lisa Hofman",
      email: "lisa@hofman.nl",
      telefoon: "06-33445566",
      straat: null,
      huisnummer: null,
      toevoeging: null,
      postcode: null,
      woonplaats: "Amersfoort",
      status: "contact_1",
      contact_attempts: 1,
      inkoopprijs: null,
      marge: null,
      verkoopprijs: null,
      netto_inkoopprijs: null,
      deal_datum: null,
      buyer_id: null,
      created_at: nowIso(3),
      updated_at: nowIso(2),
    },
    {
      id: "lead-demo-5",
      merk: "Hyster",
      model: "H2.5FT",
      timing: "Zo snel mogelijk",
      naam: "Tom Visser",
      email: "tom@visser.nl",
      telefoon: "06-77889900",
      straat: null,
      huisnummer: null,
      toevoeging: null,
      postcode: null,
      woonplaats: "Hilversum",
      status: "geen_interesse",
      contact_attempts: 2,
      inkoopprijs: null,
      marge: null,
      verkoopprijs: null,
      netto_inkoopprijs: null,
      deal_datum: null,
      buyer_id: null,
      created_at: nowIso(8),
      updated_at: nowIso(6),
    },
    {
      id: "lead-demo-6",
      merk: "Yale",
      model: "GDP25VX",
      timing: "Binnen een week",
      naam: "Anita Smit",
      email: "anita@smit.nl",
      telefoon: "06-55667788",
      straat: null,
      huisnummer: null,
      toevoeging: null,
      postcode: null,
      woonplaats: "Almere",
      status: "geen_contact",
      contact_attempts: 7,
      inkoopprijs: null,
      marge: null,
      verkoopprijs: null,
      netto_inkoopprijs: null,
      deal_datum: null,
      buyer_id: null,
      created_at: nowIso(12),
      updated_at: nowIso(4),
    },
  ];

  const photos: LeadPhotoRow[] = [
    {
      id: "photo-demo-1",
      lead_id: "lead-demo-3",
      filename: "demo-1.jpg",
      original_name: "voorkant.jpg",
      mime_type: "image/jpeg",
      size: 120000,
      url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80",
      storage_path: null,
      created_at: nowIso(4),
    },
    {
      id: "photo-demo-2",
      lead_id: "lead-demo-3",
      filename: "demo-2.jpg",
      original_name: "zijkant.jpg",
      mime_type: "image/jpeg",
      size: 110000,
      url: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80",
      storage_path: null,
      created_at: nowIso(4),
    },
    {
      id: "photo-demo-3",
      lead_id: "lead-demo-2",
      filename: "demo-3.jpg",
      original_name: "overzicht.jpg",
      mime_type: "image/jpeg",
      size: 98000,
      url: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400&q=80",
      storage_path: null,
      created_at: nowIso(1),
    },
  ];

  const contracts: ContractRow[] = [
    {
      id: "contract-demo-1",
      lead_id: "lead-demo-3",
      buyer_id: "buyer-demo-1",
      status: "verstuurd",
      sent_at: nowIso(2),
      created_at: nowIso(2),
      updated_at: nowIso(2),
    },
  ];

  const listingStart = nowIso(1);
  const listings: MarketplaceListingRow[] = [
    {
      id: "listing-demo-1",
      lead_id: "lead-demo-2",
      slug: "demo" + makeListingSlug().slice(0, 8),
      omschrijving:
        "Nette Linde H25D, goed onderhouden, direct inzetbaar. Incl. recente servicehistorie.",
      woonplaats: "Groenekan",
      merk: "Linde",
      model: "H25D",
      status: "actief",
      starts_at: listingStart,
      ends_at: auctionEndsAt(new Date(listingStart)),
      created_at: listingStart,
      updated_at: listingStart,
    },
  ];

  const bids: MarketplaceBidRow[] = [
    {
      id: "bid-demo-1",
      listing_id: "listing-demo-1",
      bidder_naam: "Petra Bakker",
      bidder_email: "petra@forkliftpro.nl",
      bidder_telefoon: "06-87654321",
      bidder_bedrijf: "Forklift Pro B.V.",
      bedrag: 14500,
      created_at: nowIso(0),
    },
  ];

  const shares: MarketplaceShareRow[] = [];

  const periodCosts: PeriodCostRow[] = [
    {
      id: "cost-demo-1",
      cost_date: nowIso(2).slice(0, 10),
      ad_spend: 120,
      sales_cost: 45,
      note: "Meta ads",
      created_at: nowIso(2),
      updated_at: nowIso(2),
    },
    {
      id: "cost-demo-2",
      cost_date: nowIso(1).slice(0, 10),
      ad_spend: 95,
      sales_cost: 30,
      note: null,
      created_at: nowIso(1),
      updated_at: nowIso(1),
    },
    {
      id: "cost-demo-3",
      cost_date: nowIso(0).slice(0, 10),
      ad_spend: 150,
      sales_cost: 60,
      note: "Google + sales",
      created_at: nowIso(0),
      updated_at: nowIso(0),
    },
  ];

  return {
    buyers,
    leads,
    photos,
    contracts,
    listings,
    bids,
    shares,
    periodCosts,
  };
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export function getDemoStore(): DemoStore {
  if (
    !g.__hvDemoStore ||
    !g.__hvDemoStore.listings ||
    !Array.isArray(g.__hvDemoStore.periodCosts) ||
    !Array.isArray(g.__hvDemoStore.bids) ||
    g.__hvDemoStoreVersion !== DEMO_STORE_VERSION
  ) {
    g.__hvDemoStore = seed();
    g.__hvDemoStoreVersion = DEMO_STORE_VERSION;
  }
  return g.__hvDemoStore;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
