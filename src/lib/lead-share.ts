import { SignJWT, jwtVerify } from "jose";
import { dealerSiteUrl } from "./dealer-auth";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Token voor privé deel-link (foto's + omschrijving, geen login/veiling). */
export async function createLeadShareToken(leadId: string): Promise<string> {
  return new SignJWT({
    role: "lead_share",
    leadId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret());
}

export async function verifyLeadShareToken(
  token: string,
): Promise<{ leadId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "lead_share" || !payload.leadId) return null;
    return { leadId: String(payload.leadId) };
  } catch {
    return null;
  }
}

export function leadShareUrl(token: string): string {
  return `${dealerSiteUrl()}/delen/${encodeURIComponent(token)}`;
}
