import { NextResponse } from "next/server";
import { crmUpdateAdminPassword } from "@/lib/admin-users";
import { getAdminSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { crmGetAdminUser } from "@/lib/admin-users";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.userId) {
    return NextResponse.json(
      {
        error:
          "Dit account (env-admin) heeft geen wachtwoord in de database. Maak een user aan onder Users, of wijzig ADMIN_PASS in Vercel.",
      },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Nieuw wachtwoord moet minimaal 8 tekens zijn" },
        { status: 400 },
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Wachtwoorden komen niet overeen" },
        { status: 400 },
      );
    }

    const user = await crmGetAdminUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User niet gevonden" }, { status: 404 });
    }
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json(
        { error: "Huidig wachtwoord is onjuist" },
        { status: 400 },
      );
    }

    await crmUpdateAdminPassword(session.userId, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wijzigen mislukt" },
      { status: 500 },
    );
  }
}
