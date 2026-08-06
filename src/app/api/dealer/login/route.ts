import { NextResponse } from "next/server";
import {
  crmFindDealerByUsername,
  crmMarkDealerActivated,
} from "@/lib/crm";
import {
  createDealerSession,
  verifyDealerInviteToken,
} from "@/lib/dealer-auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json();
  const invite =
    typeof body.invite === "string" ? body.invite.trim() : "";

  try {
    let user = String(body.user ?? "").trim();
    let pass = String(body.pass ?? "");
    let justActivated = false;

    if (invite) {
      const payload = await verifyDealerInviteToken(invite);
      if (!payload) {
        return NextResponse.json(
          { error: "Uitnodigingslink is ongeldig of verlopen" },
          { status: 400 },
        );
      }
      // Oude invite-links met wachtwoord in token: auto-login
      if (!payload.password) {
        return NextResponse.json(
          {
            error: "Gebruik de onboarding-link om je wachtwoord in te stellen",
            redirect: `/dealer/onboarding?invite=${encodeURIComponent(invite)}`,
          },
          { status: 400 },
        );
      }
      user = payload.email;
      pass = payload.password;
    }

    if (!user || !pass) {
      return NextResponse.json(
        { error: "Vul e-mail en wachtwoord in" },
        { status: 400 },
      );
    }

    const dealer = await crmFindDealerByUsername(user);
    if (
      !dealer ||
      !dealer.dealer_password_hash ||
      !verifyPassword(pass, dealer.dealer_password_hash)
    ) {
      return NextResponse.json(
        { error: "Ongeldige inloggegevens" },
        { status: 401 },
      );
    }

    await createDealerSession({
      buyerId: dealer.id,
      naam: dealer.naam,
      bedrijf: dealer.bedrijf,
      email: dealer.email,
      telefoon: dealer.telefoon,
    });

    justActivated = await crmMarkDealerActivated(dealer.id);

    return NextResponse.json({
      ok: true,
      justActivated,
      dealer: {
        id: dealer.id,
        naam: dealer.naam,
        bedrijf: dealer.bedrijf,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login mislukt" },
      { status: 500 },
    );
  }
}
