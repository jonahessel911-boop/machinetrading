export type BuyerRow = {
  id: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  bedrijf: string;
  dealer_username?: string | null;
  dealer_password_hash?: string | null;
  dealer_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadRow = {
  id: string;
  merk: string;
  model: string | null;
  timing: string;
  naam: string;
  email: string;
  telefoon: string;
  straat: string | null;
  huisnummer: string | null;
  toevoeging: string | null;
  postcode: string | null;
  woonplaats: string;
  status: string;
  contact_attempts: number;
  inkoopprijs: number | null;
  marge: number | null;
  verkoopprijs: number | null;
  netto_inkoopprijs: number | null;
  deal_datum: string | null;
  /** Optionele bedrijfsnaam verkoper (koopcontract) */
  bedrijfsnaam?: string | null;
  buyer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadPhotoRow = {
  id: string;
  lead_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  storage_path: string | null;
  created_at: string;
};

export type ContractRow = {
  id: string;
  lead_id: string;
  buyer_id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Buyer = {
  id: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  bedrijf: string;
  dealerUsername: string | null;
  dealerEnabled: boolean;
  hasDealerPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeadPhoto = {
  id: string;
  leadId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storagePath: string | null;
  createdAt: string;
};

export type Contract = {
  id: string;
  leadId: string;
  buyerId: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  buyer?: Buyer;
};

export type Lead = {
  id: string;
  merk: string;
  model: string | null;
  timing: string;
  naam: string;
  email: string;
  telefoon: string;
  straat: string | null;
  huisnummer: string | null;
  toevoeging: string | null;
  postcode: string | null;
  woonplaats: string;
  status: string;
  contactAttempts: number;
  inkoopprijs: number | null;
  marge: number | null;
  verkoopprijs: number | null;
  nettoInkoopprijs: number | null;
  dealDatum: string | null;
  /** Optionele bedrijfsnaam verkoper */
  bedrijfsnaam: string | null;
  buyerId: string | null;
  createdAt: string;
  updatedAt: string;
  buyer?: Buyer | null;
  photos?: LeadPhoto[];
  contracts?: Contract[];
};

export function mapBuyer(row: BuyerRow): Buyer {
  return {
    id: row.id,
    naam: row.naam,
    email: row.email,
    telefoon: row.telefoon,
    bedrijf: row.bedrijf,
    dealerUsername: row.dealer_username ?? null,
    dealerEnabled: Boolean(row.dealer_enabled),
    hasDealerPassword: Boolean(row.dealer_password_hash),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPhoto(row: LeadPhotoRow): LeadPhoto {
  return {
    id: row.id,
    leadId: row.lead_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    url: row.url,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

export function mapContract(
  row: ContractRow & { buyer?: BuyerRow | null },
): Contract {
  return {
    id: row.id,
    leadId: row.lead_id,
    buyerId: row.buyer_id,
    status: row.status,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyer: row.buyer ? mapBuyer(row.buyer) : undefined,
  };
}

export function mapLead(
  row: LeadRow & {
    buyer?: BuyerRow | null;
    photos?: LeadPhotoRow[];
    contracts?: (ContractRow & { buyer?: BuyerRow | null })[];
  },
): Lead {
  return {
    id: row.id,
    merk: row.merk,
    model: row.model,
    timing: row.timing,
    naam: row.naam,
    email: row.email,
    telefoon: row.telefoon,
    straat: row.straat,
    huisnummer: row.huisnummer,
    toevoeging: row.toevoeging,
    postcode: row.postcode,
    woonplaats: row.woonplaats,
    status: row.status,
    contactAttempts: row.contact_attempts,
    inkoopprijs: row.inkoopprijs,
    marge: row.marge,
    verkoopprijs: row.verkoopprijs ?? null,
    nettoInkoopprijs: row.netto_inkoopprijs ?? null,
    dealDatum: row.deal_datum ?? null,
    bedrijfsnaam: row.bedrijfsnaam ?? null,
    buyerId: row.buyer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyer: row.buyer ? mapBuyer(row.buyer) : row.buyer === null ? null : undefined,
    photos: row.photos?.map(mapPhoto),
    contracts: row.contracts?.map(mapContract),
  };
}

export function formatAddress(lead: {
  straat?: string | null;
  huisnummer?: string | null;
  toevoeging?: string | null;
  postcode?: string | null;
  woonplaats?: string | null;
}): string {
  const street = [lead.straat, lead.huisnummer, lead.toevoeging]
    .filter(Boolean)
    .join(" ");
  const city = [lead.postcode, lead.woonplaats].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ") || "—";
}
