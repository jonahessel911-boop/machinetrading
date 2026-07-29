import { STATUS_LABELS } from "./constants";

export function statusFromAttempts(attempts: number): string {
  if (attempts <= 0) return "nieuw";
  if (attempts >= 7) return "geen_contact";
  return `contact_${attempts}`;
}

export function labelForStatus(status: string, attempts?: number): string {
  if (status.startsWith("contact_") && attempts !== undefined) {
    return `Contact poging ${attempts}/7`;
  }
  return STATUS_LABELS[status] ?? status;
}

export function formatEuro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact: €23.8k / €0.9k / €1.2M — 1 decimaal, niet afronden naar hele euro’s */
export function formatEuroK(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}€${m.toLocaleString("nl-NL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}M`;
  }
  const k = abs / 1000;
  return `${sign}€${k.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}k`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
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
