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

const DEMO_STORE_VERSION = 6;

function emptyStore(): DemoStore {
  return {
    buyers: [],
    leads: [],
    photos: [],
    contracts: [],
    listings: [],
    bids: [],
    shares: [],
    periodCosts: [],
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
    g.__hvDemoStore = emptyStore();
    g.__hvDemoStoreVersion = DEMO_STORE_VERSION;
  }
  return g.__hvDemoStore;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
