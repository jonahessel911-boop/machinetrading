import { NextResponse } from "next/server";
import { crmCreateLead } from "@/lib/crm";
import {
  clientContextFromRequest,
  fbcFromFbclid,
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

    const cookieMeta = readMetaCookiesFromHeader(request.headers.get("cookie"));
    const fbp =
      (typeof body.fbp === "string" && body.fbp.trim()) ||
      cookieMeta.fbp ||
      null;
    const fbclid =
      (typeof body.fbclid === "string" && body.fbclid.trim()) || null;
    const fbc =
      (typeof body.fbc === "string" && body.fbc.trim()) ||
      cookieMeta.fbc ||
      fbcFromFbclid(fbclid) ||
      null;
    const eventSourceUrl =
      (typeof body.eventSourceUrl === "string" && body.eventSourceUrl) ||
      request.headers.get("referer") ||
      null;

    const lead = await crmCreateLead({
      merk: String(merk),
      model: model ? String(model) : "Onbekend",
      timing: String(timing),
      naam: String(naam).trim(),
      email: String(email).trim(),
      telefoon: String(telefoon).trim(),
      woonplaats: String(woonplaats).trim(),
      meta_fbp: fbp,
      meta_fbc: fbc,
      meta_fbclid: fbclid,
    });

    const ctx = await clientContextFromRequest(request);

    // Zelfde event_id als browser-Pixel → Meta kan dedupliceren
    const metaEventId =
      (typeof body.metaEventId === "string" && body.metaEventId.trim()) ||
      `lead-${lead.id}`;

    // Await (niet fire-and-forget): serverless killt anders CAPI → lage Pixel-coverage
    const result = await sendMetaLeadEvent({
      leadId: lead.id,
      email: lead.email,
      phone: lead.telefoon,
      naam: lead.naam,
      woonplaats: lead.woonplaats,
      merk: lead.merk,
      model: lead.model,
      eventId: metaEventId,
      eventSourceUrl,
      fbp,
      fbc,
      clientIpAddress: ctx.clientIpAddress,
      clientUserAgent: ctx.clientUserAgent,
    });
    console.info("[meta-capi:lead]", {
      leadId: lead.id,
      eventId: metaEventId,
      ok: result.ok,
      skipped: result.skipped,
      eventsReceived: result.eventsReceived,
      error: result.error,
      hasFbc: Boolean(fbc),
      hasFbp: Boolean(fbp),
      hasFbclid: Boolean(fbclid),
    });
    if (!fbc) {
      console.warn(
        "[meta-capi:lead] Geen fbc/fbclid — lead wordt niet aan ad-klik gekoppeld",
        { leadId: lead.id },
      );
    }

    return NextResponse.json({
      ok: true,
      id: lead.id,
      metaEventId,
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
