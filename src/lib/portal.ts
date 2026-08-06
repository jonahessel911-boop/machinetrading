import type { Lead } from "@/lib/mappers";
import { portalStatus, vehicleLabel, type PortalStatus } from "@/lib/status";

/** Safe payload for customer portal (no dealer/marge internals). */
export type PortalLeadView = {
  id: string;
  naam: string;
  email: string;
  telefoon: string;
  merk: string;
  model: string | null;
  timing: string;
  woonplaats: string;
  vehicleLabel: string;
  status: PortalStatus;
  createdAt: string;
  dealDatum: string | null;
  /** Alleen tonen bij verkocht */
  inkoopprijs: number | null;
  omschrijving: string;
  /** ISO timestamps van contactpogingen */
  contactAttemptTimes: string[];
  photos: { id: string; url: string }[];
  contracts: {
    id: string;
    status: string;
    sentAt: string | null;
  }[];
};

export function toPortalLeadView(lead: Lead): PortalLeadView {
  const status = portalStatus(lead.status);
  const showPrice = status.key === "verkocht" && lead.inkoopprijs != null;
  return {
    id: lead.id,
    naam: lead.naam,
    email: lead.email,
    telefoon: lead.telefoon,
    merk: lead.merk,
    model: lead.model,
    timing: lead.timing,
    woonplaats: lead.woonplaats,
    vehicleLabel: vehicleLabel(lead.merk, lead.model),
    status,
    createdAt: lead.createdAt,
    dealDatum: lead.dealDatum,
    inkoopprijs: showPrice ? lead.inkoopprijs : null,
    omschrijving: lead.omschrijving ?? "",
    contactAttemptTimes: lead.contactAttemptTimes ?? [],
    photos: (lead.photos ?? []).map((p) => ({ id: p.id, url: p.url })),
    contracts: (lead.contracts ?? [])
      .filter((c) => c.status === "verstuurd" || c.status === "getekend")
      .map((c) => ({
        id: c.id,
        status: c.status,
        sentAt: c.sentAt,
      })),
  };
}
