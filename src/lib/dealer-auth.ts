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
  buyerId: string;
  /** @deprecated optioneel voor oude links */
  password?: string;
}): Promise<string> {
  return new SignJWT({
    role: "dealer_invite",
    email: opts.email.trim().toLowerCase(),
    buyerId: opts.buyerId,
    ...(opts.password ? { password: opts.password } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyDealerInviteToken(
  token: string,
): Promise<{
  email: string;
  buyerId: string;
  password: string | null;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.role !== "dealer_invite" ||
      !payload.email ||
      !payload.buyerId
    ) {
      return null;
    }
    return {
      email: String(payload.email).toLowerCase(),
      buyerId: String(payload.buyerId),
      password: payload.password ? String(payload.password) : null,
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
  return `${dealerSiteUrl()}/dealer/onboarding?invite=${encodeURIComponent(token)}`;
}

export function dealerLoginUrl(): string {
  return `${dealerSiteUrl()}/dealer/login`;
}

export function dealerResetPasswordUrl(token: string): string {
  return `${dealerSiteUrl()}/dealer/reset?token=${encodeURIComponent(token)}`;
}

export async function createDealerResetToken(opts: {
  email: string;
  buyerId: string;
}): Promise<string> {
  return new SignJWT({
    role: "dealer_reset",
    email: opts.email.trim().toLowerCase(),
    buyerId: opts.buyerId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getSecret());
}

export async function verifyDealerResetToken(
  token: string,
): Promise<{ email: string; buyerId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.role !== "dealer_reset" ||
      !payload.email ||
      !payload.buyerId
    ) {
      return null;
    }
    return {
      email: String(payload.email).toLowerCase(),
      buyerId: String(payload.buyerId),
    };
  } catch {
    return null;
  }
}

export async function requireDealer(): Promise<DealerSession> {
  const session = await getDealerSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
