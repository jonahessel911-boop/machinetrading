import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  mpGetByLeadId,
  mpListAllAdmin,
  mpPublishLead,
  mpRepublish,
  mpUnpublish,
} from "@/lib/marketplace-data";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  try {
    if (leadId) {
      const listing = await mpGetByLeadId(leadId);
      return NextResponse.json(listing);
    }
    const listings = await mpListAllAdmin();
    return NextResponse.json(listings);
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
  const action = String(body.action ?? "publish");

  try {
    if (action === "publish") {
      const leadId = String(body.leadId ?? "");
      if (!leadId) {
        return NextResponse.json({ error: "leadId verplicht" }, { status: 400 });
      }
      const listing = await mpPublishLead({
        leadId,
        omschrijving: body.omschrijving ?? null,
      });
      return NextResponse.json(listing);
    }

    if (action === "republish") {
      const listingId = String(body.listingId ?? "");
      if (!listingId) {
        return NextResponse.json(
          { error: "listingId verplicht" },
          { status: 400 },
        );
      }
      const listing = await mpRepublish(listingId);
      return NextResponse.json(listing);
    }

    if (action === "unpublish") {
      const listingId = String(body.listingId ?? "");
      if (!listingId) {
        return NextResponse.json(
          { error: "listingId verplicht" },
          { status: 400 },
        );
      }
      const listing = await mpUnpublish(listingId);
      return NextResponse.json(listing);
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
