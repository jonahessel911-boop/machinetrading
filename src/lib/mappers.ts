export type BuyerRow = {
  id: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  bedrijf: string;
  dealer_username?: string | null;
  dealer_password_hash?: string | null;
  dealer_enabled?: boolean;
  dealer_activated_at?: string | null;
  /** Interne CRM-notities */
  notities?: string | null;
  /** Ontvangt dagelijks "Aanbod van de dag" */
  daily_digest?: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadRow = {
  id: string;
  merk: string;
  model: string | null;
  timing: string;
  /** Richtprijs die verkoper via formulier opgaf */
  richtprijs?: number | null;
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
  /** Timestamps van contactpogingen (ISO) */
  contact_attempt_times?: string[] | null;
  inkoopprijs: number | null;
  marge: number | null;
  verkoopprijs: number | null;
  netto_inkoopprijs: number | null;
  deal_datum: string | null;
  /** Optionele bedrijfsnaam verkoper (koopcontract) */
  bedrijfsnaam?: string | null;
  /** Verkoopmedewerker die de deal heeft gedaan */
  verkoopmedewerker?: string | null;
  /** Meta attribution van bezoeker bij form-submit */
  meta_fbp?: string | null;
  meta_fbc?: string | null;
  meta_fbclid?: string | null;
  /** Portaal/marketplace omschrijving */
  omschrijving?: string | null;
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
  sort_order?: number;
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
  /** Eerste marketplace-login; null = nog niet geactiveerd */
  dealerActivatedAt: string | null;
  /** Interne CRM-notities */
  notities: string;
  /** Ontvangt dagelijks "Aanbod van de dag" */
  dailyDigest: boolean;
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
  sortOrder: number;
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
  /** Richtprijs die verkoper via formulier opgaf */
  richtprijs: number | null;
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
  /** Timestamps van contactpogingen (ISO) */
  contactAttemptTimes: string[];
  inkoopprijs: number | null;
  marge: number | null;
  verkoopprijs: number | null;
  nettoInkoopprijs: number | null;
  dealDatum: string | null;
  /** Optionele bedrijfsnaam verkoper */
  bedrijfsnaam: string | null;
  /** Verkoopmedewerker die de deal heeft gedaan */
  verkoopmedewerker: string | null;
  /** Meta attribution (voor Deal CAPI) */
  metaFbp: string | null;
  metaFbc: string | null;
  metaFbclid: string | null;
  /** Portaal/marketplace omschrijving */
  omschrijving: string | null;
  buyerId: string | null;
  createdAt: string;
  updatedAt: string;
  buyer?: Buyer | null;
  photos?: LeadPhoto[];
  contracts?: Contract[];
  /** Hoogste handelaarsbod (selectieportaal) */
  highestBid?: number | null;
  highestBidBidder?: string | null;
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
    dealerActivatedAt: row.dealer_activated_at ?? null,
    notities: row.notities ?? "",
    dailyDigest: Boolean(row.daily_digest),
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
    sortOrder: Number(row.sort_order ?? 0),
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
    richtprijs:
      row.richtprijs == null || !Number.isFinite(Number(row.richtprijs))
        ? null
        : Number(row.richtprijs),
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
    contactAttemptTimes: Array.isArray(row.contact_attempt_times)
      ? row.contact_attempt_times.map((t) => String(t))
      : [],
    inkoopprijs: row.inkoopprijs,
    marge: row.marge,
    verkoopprijs: row.verkoopprijs ?? null,
    nettoInkoopprijs: row.netto_inkoopprijs ?? null,
    dealDatum: row.deal_datum ?? null,
    bedrijfsnaam: row.bedrijfsnaam ?? null,
    verkoopmedewerker: row.verkoopmedewerker ?? null,
    metaFbp: row.meta_fbp ?? null,
    metaFbc: row.meta_fbc ?? null,
    metaFbclid: row.meta_fbclid ?? null,
    omschrijving: row.omschrijving ?? null,
    buyerId: row.buyer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyer: row.buyer ? mapBuyer(row.buyer) : row.buyer === null ? null : undefined,
    photos: row.photos
      ? [...row.photos]
          .map(mapPhoto)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      : undefined,
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
