/** Remaining auction time helpers (client + server safe). */

export function remainingParts(endsAt: string | Date, now = new Date()) {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const ms = Math.max(0, end.getTime() - now.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { ms, days, hours, minutes, expired: ms <= 0 };
}

/** Grid/table: "3 dagen en 4 uur" / "5 uur" / "Afgerond" */
export function formatRemainingRounded(endsAt: string | Date, now = new Date()): string {
  const { days, hours, minutes, expired } = remainingParts(endsAt, now);
  if (expired) return "Afgerond";
  if (days > 0) {
    if (hours > 0) return `${days} ${days === 1 ? "dag" : "dagen"} en ${hours} uur`;
    return `${days} ${days === 1 ? "dag" : "dagen"}`;
  }
  if (hours > 0) return `${hours} uur`;
  if (minutes > 0) return `${minutes} min`;
  return "Minder dan 1 min";
}

/** Detail: "3 dagen, 4 uur en 12 min" */
export function formatRemainingPrecise(endsAt: string | Date, now = new Date()): string {
  const { days, hours, minutes, expired } = remainingParts(endsAt, now);
  if (expired) return "Afgerond";
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "dag" : "dagen"}`);
  if (hours > 0) parts.push(`${hours} uur`);
  parts.push(`${minutes} min`);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} en ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} en ${parts[2]}`;
}
