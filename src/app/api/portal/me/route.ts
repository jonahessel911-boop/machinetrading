import { NextResponse } from "next/server";
import { crmGetLead, crmUpdateLead } from "@/lib/crm";
import { mpSyncOmschrijvingForLead } from "@/lib/marketplace-data";
import { getPortalSession } from "@/lib/portal-auth";
import { toPortalLeadView } from "@/lib/portal";

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lead = await crmGetLead(session.leadId);
    if (!lead) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }
    if (lead.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ lead: toPortalLeadView(lead) });
  } catch (err) {
    console.error("[portal:me]", err);
    return NextResponse.json({ error: "Fout" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lead = await crmGetLead(session.leadId);
    if (!lead) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }
    if (lead.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!("omschrijving" in body)) {
      return NextResponse.json(
        { error: "Geen wijzigingen" },
        { status: 400 },
      );
    }

    const omschrijving =
      typeof body.omschrijving === "string"
        ? body.omschrijving.trim().slice(0, 2000)
        : "";

    const updated = await crmUpdateLead(lead.id, {
      omschrijving: omschrijving || null,
    });
    await mpSyncOmschrijvingForLead(lead.id, omschrijving || null);

    if (!updated) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({ lead: toPortalLeadView(updated) });
  } catch (err) {
    console.error("[portal:me:patch]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
