import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  mpGetByLeadId,
  mpListAllAdmin,
  mpPublishLead,
  mpRepublish,
  mpSyncOmschrijvingForLead,
  mpUnpublish,
} from "@/lib/marketplace-data";
import { crmUpdateLead } from "@/lib/crm";

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
      const omschrijving =
        typeof body.omschrijving === "string"
          ? body.omschrijving.trim()
          : body.omschrijving ?? null;

      // Houd lead.omschrijving in sync met marketplace
      await crmUpdateLead(leadId, {
        omschrijving: omschrijving || null,
      });

      const listing = await mpPublishLead({
        leadId,
        omschrijving: omschrijving ?? null,
      });
      return NextResponse.json(listing);
    }

    if (action === "update_omschrijving") {
      const leadId = String(body.leadId ?? "");
      if (!leadId) {
        return NextResponse.json({ error: "leadId verplicht" }, { status: 400 });
      }
      const omschrijving =
        typeof body.omschrijving === "string"
          ? body.omschrijving.trim()
          : "";
      await crmUpdateLead(leadId, {
        omschrijving: omschrijving || null,
      });
      await mpSyncOmschrijvingForLead(leadId, omschrijving || null);
      const listing = await mpGetByLeadId(leadId);
      return NextResponse.json({ ok: true, listing });
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
