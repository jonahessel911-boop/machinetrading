import { NextResponse } from "next/server";
import { crmGetBuyerRow } from "@/lib/crm";
import { verifyDealerInviteToken } from "@/lib/dealer-auth";
import { mpListPublic } from "@/lib/marketplace-data";
import { mapBuyer } from "@/lib/mappers";

/** Invite-info voor onboarding (geen wachtwoord meer in de response). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  if (!token) {
    return NextResponse.json({ error: "Geen token" }, { status: 400 });
  }

  const payload = await verifyDealerInviteToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Uitnodigingslink is ongeldig of verlopen" },
      { status: 400 },
    );
  }

  const row = await crmGetBuyerRow(payload.buyerId);
  if (!row) {
    return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
  }

  const buyer = mapBuyer(row);
  const listings = await mpListPublic().catch(() => []);

  return NextResponse.json({
    email: payload.email || buyer.dealerUsername || buyer.email,
    bedrijf: buyer.bedrijf,
    naam: buyer.naam,
    buyerId: buyer.id,
    activated: Boolean(buyer.dealerActivatedAt),
    hasPassword: buyer.hasDealerPassword,
    dealCount: listings.length,
  });
}
