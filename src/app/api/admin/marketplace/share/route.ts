import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { marketplaceShareEmail, sendEmail } from "@/lib/email";
import { listingTitle } from "@/lib/marketplace";
import {
  mpGetByLeadId,
  mpPublishLead,
  mpRecordShare,
  mpSearchBuyers,
  mpTopBuyers,
} from "@/lib/marketplace-data";

function absoluteUrl(path: string, request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return `${env}${path}`;
  const origin = new URL(request.url).origin;
  return `${origin}${path}`;
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  try {
    const buyers = q ? await mpSearchBuyers(q) : await mpTopBuyers(10);
    return NextResponse.json(buyers);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const leadId = String(body.leadId ?? "");
  const email = String(body.email ?? "").trim();
  const buyerId = body.buyerId ? String(body.buyerId) : null;
  const toName = String(body.toName ?? "handelaar");

  if (!leadId || !email) {
    return NextResponse.json(
      { error: "leadId en email zijn verplicht" },
      { status: 400 },
    );
  }

  try {
    let listing = await mpGetByLeadId(leadId);
    if (!listing?.isLive) {
      listing = await mpPublishLead({
        leadId,
        omschrijving: body.omschrijving ?? null,
      });
    }

    const url = absoluteUrl(listing.publicUrl!, request);
    const mail = marketplaceShareEmail({
      toName,
      listingTitle: listingTitle(listing),
      woonplaats: listing.woonplaats,
      url,
      endsAt: listing.endsAt,
    });

    const sent = await sendEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error || "E-mail versturen mislukt" },
        { status: 502 },
      );
    }

    await mpRecordShare({
      listingId: listing.id,
      email,
      buyerId,
    });

    return NextResponse.json({
      ok: true,
      mode: sent.mode,
      url,
      listing,
      message:
        sent.mode === "demo"
          ? `Demo: e-mail gesimuleerd naar ${email}. Deel-link: ${url}`
          : `E-mail verstuurd naar ${email}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
