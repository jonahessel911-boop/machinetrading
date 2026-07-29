import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-auth";
import { mpGetBySlug, mpListPublic, mpPlaceBid } from "@/lib/marketplace-data";

export async function GET(request: Request) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (slug) {
      const listing = await mpGetBySlug(slug, { includeExpired: true });
      if (!listing) {
        return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
      }
      return NextResponse.json(listing);
    }
    const listings = await mpListPublic();
    return NextResponse.json(listings);
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
    return NextResponse.json(listing);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bod mislukt" },
      { status: 400 },
    );
  }
}
