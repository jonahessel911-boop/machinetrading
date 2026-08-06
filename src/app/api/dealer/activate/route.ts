import { NextResponse } from "next/server";
import {
  crmGetBuyerRow,
  crmMarkDealerActivated,
  crmUpdateBuyer,
} from "@/lib/crm";
import {
  createDealerSession,
  verifyDealerInviteToken,
} from "@/lib/dealer-auth";
import { hashPassword } from "@/lib/password";

/** Onboarding: wachtwoord zetten + sessie starten. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invite =
      typeof body.invite === "string" ? body.invite.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const passwordConfirm =
      typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";

    if (!invite) {
      return NextResponse.json(
        { error: "Ongeldige uitnodigingslink" },
        { status: 400 },
      );
    }

    const payload = await verifyDealerInviteToken(invite);
    if (!payload) {
      return NextResponse.json(
        { error: "Uitnodigingslink is ongeldig of verlopen" },
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
    if (!row) {
      return NextResponse.json(
        { error: "Account niet gevonden" },
        { status: 404 },
      );
    }

    const email = (
      payload.email ||
      row.dealer_username ||
      row.email ||
      ""
    )
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Geen e-mailadres op dit account" },
        { status: 400 },
      );
    }

    const updated = await crmUpdateBuyer(payload.buyerId, {
      dealer_username: email,
      dealer_password_hash: hashPassword(password),
      dealer_enabled: true,
      email: row.email || email,
    });
    if (!updated) {
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    await createDealerSession({
      buyerId: updated.id,
      naam: updated.naam,
      bedrijf: updated.bedrijf,
      email: updated.email,
      telefoon: updated.telefoon,
    });

    const justActivated = await crmMarkDealerActivated(updated.id);

    return NextResponse.json({
      ok: true,
      justActivated,
      dealer: {
        id: updated.id,
        naam: updated.naam,
        bedrijf: updated.bedrijf,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Activeren mislukt" },
      { status: 500 },
    );
  }
}
