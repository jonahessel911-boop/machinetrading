import { randomBytes } from "node:crypto";
import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { hashPassword } from "./password";
import { getSupabaseAdmin } from "./supabase";

export const ADMIN_LOGIN_DOMAIN = "heftruckverkocht.nl";

export type AdminUserRow = {
  id: string;
  naam: string;
  email: string;
  private_email: string | null;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  naam: string;
  email: string;
  privateEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    naam: row.naam,
    email: row.email,
    privateEmail: row.private_email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isHeftruckLoginEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ADMIN_LOGIN_DOMAIN}`);
}

export function generateAdminPassword(length = 14): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function crmListAdminUsers(): Promise<AdminUser[]> {
  if (isDemoMode()) {
    return getDemoStore()
      .adminUsers.slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map(mapUser);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, naam, email, private_email, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapUser({
      ...(row as Omit<AdminUserRow, "password_hash">),
      password_hash: "",
    }),
  );
}

export async function crmFindAdminUserByEmail(
  email: string,
): Promise<AdminUserRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (isDemoMode()) {
    return (
      getDemoStore().adminUsers.find(
        (u) => u.email.toLowerCase() === normalized,
      ) ?? null
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .ilike("email", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AdminUserRow) ?? null;
}

export async function crmGetAdminUser(
  id: string,
): Promise<AdminUserRow | null> {
  if (isDemoMode()) {
    return getDemoStore().adminUsers.find((u) => u.id === id) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AdminUserRow) ?? null;
}

export async function crmCreateAdminUser(input: {
  naam: string;
  email: string;
  privateEmail: string;
  password: string;
}): Promise<AdminUser> {
  const now = new Date().toISOString();
  const email = input.email.trim().toLowerCase();
  const privateEmail = input.privateEmail.trim().toLowerCase();
  const naam = input.naam.trim();

  if (!naam) throw new Error("Naam is verplicht");
  if (!isHeftruckLoginEmail(email)) {
    throw new Error(
      `Login e-mail moet eindigen op @${ADMIN_LOGIN_DOMAIN} (bijv. naam@${ADMIN_LOGIN_DOMAIN})`,
    );
  }
  if (!privateEmail.includes("@")) {
    throw new Error("Vul een geldig privé e-mailadres in");
  }

  const existing = await crmFindAdminUserByEmail(email);
  if (existing) throw new Error("Er bestaat al een user met dit login-adres");

  const row: AdminUserRow = {
    id: newId("admin"),
    naam,
    email,
    private_email: privateEmail,
    password_hash: hashPassword(input.password),
    created_at: now,
    updated_at: now,
  };

  if (isDemoMode()) {
    getDemoStore().adminUsers.unshift(row);
    return mapUser(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      id: row.id,
      naam: row.naam,
      email: row.email,
      private_email: row.private_email,
      password_hash: row.password_hash,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
    .select("id, naam, email, private_email, created_at, updated_at")
    .single();

  if (error || !data) {
    if (error?.message?.toLowerCase().includes("unique")) {
      throw new Error("Er bestaat al een user met dit login-adres");
    }
    throw new Error(error?.message ?? "User aanmaken mislukt");
  }

  return mapUser({
    ...(data as Omit<AdminUserRow, "password_hash">),
    password_hash: "",
  });
}

export async function crmUpdateAdminPassword(
  id: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("Wachtwoord moet minimaal 8 tekens zijn");
  }
  const password_hash = hashPassword(newPassword);
  const updated_at = new Date().toISOString();

  if (isDemoMode()) {
    const store = getDemoStore();
    const user = store.adminUsers.find((u) => u.id === id);
    if (!user) throw new Error("User niet gevonden");
    user.password_hash = password_hash;
    user.updated_at = updated_at;
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("admin_users")
    .update({ password_hash, updated_at })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function crmDeleteAdminUser(id: string): Promise<void> {
  if (isDemoMode()) {
    const store = getDemoStore();
    store.adminUsers = store.adminUsers.filter((u) => u.id !== id);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
