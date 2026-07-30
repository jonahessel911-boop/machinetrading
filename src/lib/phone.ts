/**
 * Format Dutch mobile numbers as they type.
 * Always normalizes toward: +31 6 XX XX XX XX
 */
export function formatNlMobileDisplay(input: string): string {
  const rawDigits = input.replace(/\D/g, "");
  if (!rawDigits) return "";

  let digits = rawDigits;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("31")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // "31" / "0031" / "0" alleen → direct +31 6
  if (!digits) digits = "6";

  // Max 9 national digits: 6 + 8
  digits = digits.slice(0, 9);

  // +31 6 12 34 56 78
  const first = digits[0] ?? "";
  const rest = digits.slice(1);
  const groups: string[] = [];
  for (let i = 0; i < rest.length; i += 2) {
    groups.push(rest.slice(i, i + 2));
  }

  let out = `+31 ${first}`;
  if (groups.length) out += ` ${groups.join(" ")}`;
  return out.trim();
}

/** E.164 for storage/API, e.g. +31612345678 */
export function toE164NlMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("31")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  if (digits.length !== 9 || !digits.startsWith("6")) return null;
  return `+31${digits}`;
}

export function isValidNlMobile(input: string): boolean {
  return toE164NlMobile(input) != null;
}
