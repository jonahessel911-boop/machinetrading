import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "vh_dealer_session";

export type DealerSession = {
  buyerId: string;
  naam: string;
  bedrijf: string;
  email: string | null;
  telefoon: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createDealerSession(dealer: DealerSession) {
  const token = await new SignJWT({
    role: "dealer",
    buyerId: dealer.buyerId,
    naam: dealer.naam,
    bedrijf: dealer.bedrijf,
    email: dealer.email,
    telefoon: dealer.telefoon,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function destroyDealerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getDealerSession(): Promise<DealerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "dealer" || !payload.buyerId) return null;
    return {
      buyerId: String(payload.buyerId),
      naam: String(payload.naam ?? ""),
      bedrijf: String(payload.bedrijf ?? ""),
      email: payload.email ? String(payload.email) : null,
      telefoon: payload.telefoon ? String(payload.telefoon) : null,
    };
  } catch {
    return null;
  }
}

export async function createDealerInviteToken(opts: {
  email: string;
  password: string;
  buyerId: string;
}): Promise<string> {
  return new SignJWT({
    role: "dealer_invite",
    email: opts.email.trim().toLowerCase(),
    password: opts.password,
    buyerId: opts.buyerId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyDealerInviteToken(
  token: string,
): Promise<{ email: string; password: string; buyerId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.role !== "dealer_invite" ||
      !payload.email ||
      !payload.password ||
      !payload.buyerId
    ) {
      return null;
    }
    return {
      email: String(payload.email).toLowerCase(),
      password: String(payload.password),
      buyerId: String(payload.buyerId),
    };
  } catch {
    return null;
  }
}

export function dealerSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.COMPANY_WEBSITE?.trim() ||
    "https://www.heftruckverkocht.nl";
  return raw.replace(/\/$/, "");
}

export function dealerInviteLoginUrl(token: string): string {
  return `${dealerSiteUrl()}/dealer/login?invite=${encodeURIComponent(token)}`;
}

export async function requireDealer(): Promise<DealerSession> {
  const session = await getDealerSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
