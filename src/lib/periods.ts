export type PeriodPreset =
  | "today"
  | "today_yesterday"
  | "last_7"
  | "last_30"
  | "all";

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Vandaag" },
  { key: "today_yesterday", label: "Vandaag en gisteren" },
  { key: "last_7", label: "Afgelopen 7 dagen" },
  { key: "last_30", label: "Afgelopen 30 dagen" },
  { key: "all", label: "Alle periodes" },
];

function utcToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function rangeForPreset(
  preset: PeriodPreset,
  now = utcToday(),
): { from: string; to: string } | null {
  if (preset === "all") return null;
  const to = toKey(now);
  if (preset === "today") return { from: to, to };
  if (preset === "today_yesterday") {
    return { from: toKey(addDays(now, -1)), to };
  }
  if (preset === "last_7") {
    return { from: toKey(addDays(now, -6)), to };
  }
  return { from: toKey(addDays(now, -29)), to };
}
