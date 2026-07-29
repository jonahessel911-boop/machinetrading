import { NextResponse } from "next/server";
import { createDealerSession } from "@/lib/dealer-auth";
import { crmFindDealerByUsername } from "@/lib/crm";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json();
  const user = String(body.user ?? "").trim();
  const pass = String(body.pass ?? "");

  if (!user || !pass) {
    return NextResponse.json(
      { error: "Vul e-mail en wachtwoord in" },
      { status: 400 },
    );
  }

  try {
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

    return NextResponse.json({
      ok: true,
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
