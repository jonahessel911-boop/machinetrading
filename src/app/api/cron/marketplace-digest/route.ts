import { NextResponse } from "next/server";
import { crmListDailyDigestBuyers } from "@/lib/crm";
import {
  marketplaceDailyDigestEmail,
  sendEmail,
} from "@/lib/email";
import { listingTitle } from "@/lib/marketplace";
import {
  amsterdamDateKey,
  mpListPublishedOnAmsterdamDay,
} from "@/lib/marketplace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.heftruckverkocht.nl"
  );
}

function absoluteUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
}

function buyerEmail(buyer: {
  email: string | null;
  dealerUsername: string | null;
}): string | null {
  const email = buyer.email?.trim() || buyer.dealerUsername?.trim() || "";
  if (!email || !email.includes("@")) return null;
  return email;
}

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

async function runDigest() {
  const dayKey = amsterdamDateKey();
  const listings = await mpListPublishedOnAmsterdamDay(dayKey);

  if (listings.length === 0) {
    return {
      ok: true,
      day: dayKey,
      listings: 0,
      sent: 0,
      skipped: true,
      reason: "Geen nieuwe listings vandaag",
    };
  }

  const buyers = await crmListDailyDigestBuyers();
  const base = siteBaseUrl();

  const items = listings.map((l) => {
    const photos = l.photos ?? [];
    const first = photos[0]?.url ?? null;
    return {
      title: listingTitle(l),
      merk: l.merk,
      model: l.model,
      omschrijving: l.omschrijving,
      woonplaats: l.woonplaats,
      photoUrl: absoluteUrl(first, base),
      extraPhotoCount: Math.max(0, photos.length - 1),
      url: `${base}${l.publicUrl}`,
    };
  });

  let sent = 0;
  const errors: { buyerId: string; error: string }[] = [];

  for (const buyer of buyers) {
    const to = buyerEmail(buyer);
    if (!to) {
      errors.push({ buyerId: buyer.id, error: "Geen geldig e-mailadres" });
      continue;
    }
    const mail = marketplaceDailyDigestEmail({
      bedrijf: buyer.bedrijf,
      items,
    });
    const result = await sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (result.ok) {
      sent += 1;
    } else {
      errors.push({
        buyerId: buyer.id,
        error: result.error || "Versturen mislukt",
      });
    }
  }

  return {
    ok: true,
    day: dayKey,
    listings: listings.length,
    recipients: buyers.length,
    sent,
    errors: errors.length ? errors : undefined,
  };
}

/**
 * Vercel Cron / handmatig: dagelijkse "Aanbod van de dag".
 * Auth: Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDigest();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Digest mislukt" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
