import { NextResponse } from "next/server";
import { crmGetBuyerRow, crmUpdateBuyer } from "@/lib/crm";
import { verifyDealerResetToken } from "@/lib/dealer-auth";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const passwordConfirm =
      typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";

    if (!token) {
      return NextResponse.json(
        { error: "Ongeldige of verlopen reset-link" },
        { status: 400 },
      );
    }

    const payload = await verifyDealerResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Ongeldige of verlopen reset-link" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Wachtwoord moet minimaal 8 tekens zijn" },
        { status: 400 },
      );
    }
    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Wachtwoorden komen niet overeen" },
        { status: 400 },
      );
    }

    const row = await crmGetBuyerRow(payload.buyerId);
    if (!row || !row.dealer_enabled) {
      return NextResponse.json(
        { error: "Account niet gevonden" },
        { status: 404 },
      );
    }

    const updated = await crmUpdateBuyer(payload.buyerId, {
      dealer_password_hash: hashPassword(password),
      dealer_enabled: true,
    });
    if (!updated) {
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Wachtwoord gewijzigd. Je kunt nu inloggen.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Wachtwoord wijzigen mislukt",
      },
      { status: 500 },
    );
  }
}
