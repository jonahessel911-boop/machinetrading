import { STATUS_LABELS } from "./constants";

export function statusFromAttempts(attempts: number): string {
  if (attempts >= 7) return "geen_interesse";
  return "nieuw";
}

export function labelForStatus(status: string, _attempts?: number): string {
  // Oude contact_* waarden waren geen echte status — toon als Nieuw
  if (status.startsWith("contact_")) return STATUS_LABELS.nieuw;
  return STATUS_LABELS[status] ?? status;
}

export function leadStatusBadgeClass(status: string): string {
  // Oude contact_* = feitelijk Nieuw
  if (status === "nieuw" || status.startsWith("contact_")) {
    return "crm-badge crm-badge-nieuw";
  }
  if (status === "afwachten_fotos") return "crm-badge crm-badge-fotos";
  if (status === "terugbellen") return "crm-badge crm-badge-terugbellen";
  if (status === "koper_zoeken" || status === "in_bemiddeling") {
    return "crm-badge crm-badge-bemiddeling";
  }
  if (status === "bod_doorgegeven") return "crm-badge crm-badge-bod";
  if (status === "deal") return "crm-badge crm-badge-deal";
  if (
    status === "geen_contact" ||
    status === "geen_interesse" ||
    status === "onrealistische_prijs" ||
    status === "verkeerd_telefoonnummer"
  ) {
    return "crm-badge crm-badge-dead";
  }
  return "crm-badge";
}

export function formatEuro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact: €23.8k / €6k / €1.2M — max. 2 decimalen */
export function formatEuroK(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs === 0) return "€0";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}€${m.toLocaleString("nl-NL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}M`;
  }
  const k = abs / 1000;
  return `${sign}€${k.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}k`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(d);
}

export function vehicleLabel(merk: string, model: string | null | undefined): string {
  const unknownMerk = !merk || merk === "Onbekend" || merk === "Anders";
  const unknownModel = !model || model === "Onbekend";
  if (unknownMerk && unknownModel) return "heftruck";
  if (unknownMerk) return model!;
  if (unknownModel) return merk;
  return `${merk} ${model}`;
}

export type PortalStatusKey = "nieuw" | "in_behandeling" | "verkocht" | "afgerond";

export type PortalStatus = {
  key: PortalStatusKey;
  label: string;
  /** 0 = Nieuw, 1 = In behandeling, 2 = Verkocht */
  stepIndex: number;
  description: string;
};

/** Klantvriendelijke status voor het portaal. */
export function portalStatus(status: string): PortalStatus {
  if (status === "nieuw") {
    return {
      key: "nieuw",
      label: "Nieuw",
      stepIndex: 0,
      description:
        "We hebben je aanmelding ontvangen. We bellen je binnen 24 uur na je aanmelding. Ondertussen gaan we op zoek naar geïnteresseerde kopers.",
    };
  }
  if (status === "deal") {
    return {
      key: "verkocht",
      label: "Verkocht",
      stepIndex: 2,
      description:
        "Gefeliciteerd — je heftruck is verkocht. De koopovereenkomst vind je hieronder.",
    };
  }
  if (
    status === "geen_contact" ||
    status === "geen_interesse" ||
    status === "onrealistische_prijs" ||
    status === "verkeerd_telefoonnummer"
  ) {
    return {
      key: "afgerond",
      label: "Afgerond",
      stepIndex: 1,
      description:
        "We konden je niet bereiken of de aanvraag is afgerond. Neem contact met ons op als je alsnog wilt verkopen.",
    };
  }
  if (status === "afwachten_fotos") {
    return {
      key: "in_behandeling",
      label: "In behandeling",
      stepIndex: 1,
      description:
        "We wachten nog op foto's van je heftruck. Upload ze via dit portaal zodat we sneller kopers kunnen benaderen.",
    };
  }
  return {
    key: "in_behandeling",
    label: "In behandeling",
    stepIndex: 1,
    description:
      "We zijn bezig met je aanvraag: kopers benaderen en de beste prijs regelen.",
  };
}
