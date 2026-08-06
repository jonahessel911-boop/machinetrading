import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-auth";
import {
  bidNotifyTo,
  bidPlacedNotifyEmail,
  sendEmail,
} from "@/lib/email";
import {
  listingTitle,
  sanitizeListingForGuest,
  sanitizeListingsForGuest,
} from "@/lib/marketplace";
import { mpGetBySlug, mpListPublic, mpPlaceBid } from "@/lib/marketplace-data";

function adminSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.heftruckverkocht.nl"
  );
}

export async function GET(request: Request) {
  const session = await getDealerSession();
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (slug) {
      const listing = await mpGetBySlug(slug, { includeExpired: true });
      if (!listing) {
        return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
      }
      return NextResponse.json(
        session ? listing : sanitizeListingForGuest(listing),
      );
    }
    const listings = await mpListPublic();
    return NextResponse.json(
      session ? listings : sanitizeListingsForGuest(listings),
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json(
      { error: "Log in als dealer om te bieden" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const slug = String(body.slug ?? "");
  const bedrag = Number(body.bedrag);

  if (!slug || !bedrag) {
    return NextResponse.json({ error: "Bod is verplicht" }, { status: 400 });
  }

  try {
    const listing = await mpPlaceBid({
      slug,
      bidderNaam: session.naam,
      bidderEmail: session.email || `${session.buyerId}@dealer.local`,
      bidderTelefoon: session.telefoon,
      bidderBedrijf: session.bedrijf,
      bedrag,
    });

    try {
      const mail = bidPlacedNotifyEmail({
        source: "marketplace",
        machineLabel: listingTitle(listing),
        bedrag,
        bedrijf: session.bedrijf,
        bidderNaam: session.naam,
        bidderEmail: session.email,
        bidderTelefoon: session.telefoon,
        adminUrl: listing.leadId
          ? `${adminSiteUrl()}/admin/leads/${listing.leadId}`
          : `${adminSiteUrl()}/admin/marketplace`,
      });
      const sent = await sendEmail({
        to: bidNotifyTo(),
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      if (!sent.ok) {
        console.error("[marketplace:bid:notify]", sent.error);
      }
    } catch (notifyErr) {
      console.error("[marketplace:bid:notify]", notifyErr);
    }

    return NextResponse.json(listing);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bod mislukt" },
      { status: 400 },
    );
  }
}
