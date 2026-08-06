import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { crmFindAdminUserByEmail } from "./admin-users";
import { verifyPassword } from "./password";

const COOKIE_NAME = "vh_admin_session";

export type AdminSession = {
  role: "admin";
  /** null = legacy env-admin (ADMIN_USER / ADMIN_PASS) */
  userId: string | null;
  email: string;
  naam: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(session: {
  userId?: string | null;
  email: string;
  naam: string;
}) {
  const token = await new SignJWT({
    role: "admin",
    userId: session.userId ?? null,
    email: session.email,
    naam: session.naam,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin") return null;
    return {
      role: "admin",
      userId: payload.userId ? String(payload.userId) : null,
      email: String(payload.email ?? ""),
      naam: String(payload.naam ?? "Admin"),
    };
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** Legacy env credentials (bootstrap / super-admin). */
export function validateEnvCredentials(user: string, pass: string): boolean {
  return (
    user === (process.env.ADMIN_USER ?? "admin") &&
    pass === (process.env.ADMIN_PASS ?? "admin123")
  );
}

/** @deprecated use authenticateAdmin */
export function validateCredentials(user: string, pass: string): boolean {
  return validateEnvCredentials(user, pass);
}

export async function authenticateAdmin(
  user: string,
  pass: string,
): Promise<AdminSession | null> {
  const login = user.trim();
  if (!login || !pass) return null;

  if (validateEnvCredentials(login, pass)) {
    return {
      role: "admin",
      userId: null,
      email: login.includes("@") ? login : `${login}@local`,
      naam: "Admin",
    };
  }

  const row = await crmFindAdminUserByEmail(login);
  if (!row || !verifyPassword(pass, row.password_hash)) return null;

  return {
    role: "admin",
    userId: row.id,
    email: row.email,
    naam: row.naam,
  };
}

