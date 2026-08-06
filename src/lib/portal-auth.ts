import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "vh_portal_session";
const MAGIC_TTL = "30d";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type PortalSession = {
  leadId: string;
  email: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

/** Signed magic-link token (URL). */
export async function createPortalToken(
  leadId: string,
  email: string,
): Promise<string> {
  return new SignJWT({
    role: "portal",
    leadId,
    email: email.trim().toLowerCase(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MAGIC_TTL)
    .sign(getSecret());
}

export async function verifyPortalToken(
  token: string,
): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "portal" || !payload.leadId || !payload.email) {
      return null;
    }
    return {
      leadId: String(payload.leadId),
      email: String(payload.email).toLowerCase(),
    };
  } catch {
    return null;
  }
}

export async function createPortalSession(session: PortalSession) {
  const token = await createPortalToken(session.leadId, session.email);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, cookieOptions());
}

/** Set session cookie on a Route Handler response (e.g. redirect). */
export async function attachPortalSession(
  response: NextResponse,
  session: PortalSession,
) {
  const token = await createPortalToken(session.leadId, session.email);
  response.cookies.set(COOKIE_NAME, token, cookieOptions());
}

export async function destroyPortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPortalToken(token);
}

export async function requirePortal(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function portalSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.COMPANY_WEBSITE?.trim() ||
    "https://www.heftruckverkocht.nl";
  return raw.replace(/\/$/, "");
}

export function portalMagicLinkUrl(token: string): string {
  return `${portalSiteUrl()}/mijn/${encodeURIComponent(token)}`;
}
