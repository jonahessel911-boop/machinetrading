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
import type { AdminUserRow } from "./admin-users";
import type { InvoiceRow } from "./invoices";
import type { LeadBidRow } from "./lead-bids";
import type { LeadMessageRow } from "./lead-messages";
import type { LeadNoteRow } from "./lead-notes";
import { isSupabaseConfigured } from "./supabase";

export type DemoStore = {
  buyers: BuyerRow[];
  leads: LeadRow[];
  photos: LeadPhotoRow[];
  contracts: ContractRow[];
  listings: MarketplaceListingRow[];
  bids: MarketplaceBidRow[];
  leadBids: LeadBidRow[];
  shares: MarketplaceShareRow[];
  periodCosts: PeriodCostRow[];
  invoices: InvoiceRow[];
  funnelEvents: FunnelEventDemoRow[];
  messages: LeadMessageRow[];
  notes: LeadNoteRow[];
  selections: {
    id: string;
    slug: string;
    naam: string;
    lead_ids: string[];
    buyer_id?: string | null;
    recipient_email?: string | null;
    recipient_naam?: string | null;
    created_by_user_id?: string | null;
    created_by_naam?: string | null;
    view_count?: number;
    first_viewed_at?: string | null;
    last_viewed_at?: string | null;
    created_at: string;
  }[];
  adminUsers: AdminUserRow[];
};

export type FunnelEventDemoRow = {
  id: string;
  site: string;
  session_id: string;
  step: string;
  created_at: string;
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

const DEMO_STORE_VERSION = 15;

function emptyStore(): DemoStore {
  return {
    buyers: [],
    leads: [],
    photos: [],
    contracts: [],
    listings: [],
    bids: [],
    leadBids: [],
    shares: [],
    periodCosts: [],
    invoices: [],
    funnelEvents: [],
    messages: [],
    notes: [],
    selections: [],
    adminUsers: [],
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
    !Array.isArray(g.__hvDemoStore.leadBids) ||
    !Array.isArray(g.__hvDemoStore.invoices) ||
    !Array.isArray(g.__hvDemoStore.funnelEvents) ||
    !Array.isArray(g.__hvDemoStore.messages) ||
    !Array.isArray(g.__hvDemoStore.notes) ||
    !Array.isArray(g.__hvDemoStore.selections) ||
    !Array.isArray(g.__hvDemoStore.adminUsers) ||
    g.__hvDemoStoreVersion !== DEMO_STORE_VERSION
  ) {
    g.__hvDemoStore = emptyStore();
    g.__hvDemoStoreVersion = DEMO_STORE_VERSION;
  }
  return g.__hvDemoStore;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
