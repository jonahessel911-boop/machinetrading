export const BRANDS = [
  "Toyota",
  "Linde",
  "Jungheinrich",
  "STILL",
  "Hyster",
  "Yale",
  "Mitsubishi",
  "Crown",
  "Clark",
  "Hangcha",
  "HELI",
  "Komatsu",
  "Bobcat / Doosan",
  "Hyundai",
] as const;

export const TIMING_OPTIONS = [
  "Zo snel mogelijk",
  "Binnen 1 maand",
  "Binnen 3 maanden",
] as const;

export const LEAD_STATUSES = [
  "nieuw",
  "terugbellen",
  "afwachten_fotos",
  "in_bemiddeling",
  "bod_doorgegeven",
  "deal",
  "geen_interesse",
  "onrealistische_prijs",
  "geen_contact",
  "verkeerd_telefoonnummer",
  // Legacy (nog in DB mogelijk)
  "contact_1",
  "contact_2",
  "contact_3",
  "contact_4",
  "contact_5",
  "contact_6",
  "contact_7",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statussen in de CRM-dropdown (bemiddelingsflow) */
export const SELECTABLE_LEAD_STATUSES = [
  "nieuw",
  "terugbellen",
  "afwachten_fotos",
  "in_bemiddeling",
  "bod_doorgegeven",
  "deal",
  "geen_interesse",
  "onrealistische_prijs",
  "geen_contact",
  "verkeerd_telefoonnummer",
] as const;

export type SelectableLeadStatus = (typeof SELECTABLE_LEAD_STATUSES)[number];

export const ACTIVE_LEAD_STATUSES = LEAD_STATUSES.filter(
  (s) => s !== "geen_contact",
);

export const STATUS_LABELS: Record<string, string> = {
  nieuw: "Nieuw",
  terugbellen: "Terugbellen",
  afwachten_fotos: "Afwachten foto's",
  in_bemiddeling: "In bemiddeling",
  bod_doorgegeven: "Bod doorgestuurd",
  deal: "Deal",
  geen_interesse: "Geen interesse",
  onrealistische_prijs: "Onrealistische prijs",
  geen_contact: "Geen contact",
  verkeerd_telefoonnummer: "Verkeerd telefoonnummer",
  contact_1: "Contact poging 1/7",
  contact_2: "Contact poging 2/7",
  contact_3: "Contact poging 3/7",
  contact_4: "Contact poging 4/7",
  contact_5: "Contact poging 5/7",
  contact_6: "Contact poging 6/7",
  contact_7: "Contact poging 7/7",
};

/** @deprecated gebruik SELECTABLE_LEAD_STATUSES */
export const MANUAL_STATUSES = SELECTABLE_LEAD_STATUSES;

/** Basis verkoopmedewerker + altijd beschikbaar naast aangemaakte admin-users */
export const SALES_REPS = ["Jona"] as const;

/** Jona + namen van aangemaakte admin-users (uniek, NL-gesorteerd). */
export function salesRepOptions(adminNames: string[] = []): string[] {
  const names = new Set<string>(SALES_REPS);
  for (const raw of adminNames) {
    const n = raw.trim();
    if (n) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "nl"));
}
