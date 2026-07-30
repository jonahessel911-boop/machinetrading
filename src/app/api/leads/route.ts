import { NextResponse } from "next/server";
import { crmCreateLead } from "@/lib/crm";
import {
  clientContextFromRequest,
  readMetaCookiesFromHeader,
  sendMetaLeadEvent,
} from "@/lib/meta-capi";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merk, model, timing, naam, email, telefoon, woonplaats } = body;

    if (!merk || !timing || !naam || !email || !telefoon || !woonplaats) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in." },
        { status: 400 },
      );
    }

    const lead = await crmCreateLead({
      merk: String(merk),
      model: model ? String(model) : "Onbekend",
      timing: String(timing),
      naam: String(naam).trim(),
      email: String(email).trim(),
      telefoon: String(telefoon).trim(),
      woonplaats: String(woonplaats).trim(),
    });

    const ctx = await clientContextFromRequest(request);
    const cookieMeta = readMetaCookiesFromHeader(request.headers.get("cookie"));
    const fbp =
      (typeof body.fbp === "string" && body.fbp) || cookieMeta.fbp || null;
    const fbc =
      (typeof body.fbc === "string" && body.fbc) || cookieMeta.fbc || null;
    const eventSourceUrl =
      (typeof body.eventSourceUrl === "string" && body.eventSourceUrl) ||
      request.headers.get("referer") ||
      null;

    // Fire-and-forget: lead opslaan mag niet falen door Meta
    void sendMetaLeadEvent({
      leadId: lead.id,
      email: lead.email,
      phone: lead.telefoon,
      naam: lead.naam,
      woonplaats: lead.woonplaats,
      merk: lead.merk,
      model: lead.model,
      eventSourceUrl,
      fbp,
      fbc,
      clientIpAddress: ctx.clientIpAddress,
      clientUserAgent: ctx.clientUserAgent,
    });

    return NextResponse.json({
      ok: true,
      id: lead.id,
      metaEventId: `lead-${lead.id}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kon lead niet opslaan.",
      },
      { status: 500 },
    );
  }
}
