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
  "contact_1",
  "contact_2",
  "contact_3",
  "contact_4",
  "contact_5",
  "contact_6",
  "contact_7",
  "geen_contact",
  "deal",
  "geen_interesse",
  "verkeerd_telefoonnummer",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ACTIVE_LEAD_STATUSES = LEAD_STATUSES.filter(
  (s) => s !== "geen_contact",
);

export const STATUS_LABELS: Record<string, string> = {
  nieuw: "Nieuw",
  contact_1: "Contact poging 1/7",
  contact_2: "Contact poging 2/7",
  contact_3: "Contact poging 3/7",
  contact_4: "Contact poging 4/7",
  contact_5: "Contact poging 5/7",
  contact_6: "Contact poging 6/7",
  contact_7: "Contact poging 7/7",
  geen_contact: "Geen contact",
  deal: "Deal",
  geen_interesse: "Geen interesse",
  verkeerd_telefoonnummer: "Verkeerd telefoonnummer",
};

export const MANUAL_STATUSES = [
  "nieuw",
  "deal",
  "geen_interesse",
  "verkeerd_telefoonnummer",
  "geen_contact",
] as const;

/** Verkoopmedewerkers die aan een lead/deal gekoppeld kunnen worden */
export const SALES_REPS = [
  "Jona",
  "Mark",
  "Lisa",
] as const;
