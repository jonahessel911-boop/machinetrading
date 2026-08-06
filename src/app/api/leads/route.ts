import { NextResponse } from "next/server";
import { crmCreateLead } from "@/lib/crm";
import { portalWelcomeEmail, sendEmail } from "@/lib/email";
import {
  clientContextFromRequest,
  fbcFromFbclid,
  readMetaCookiesFromHeader,
  sendMetaLeadEvent,
} from "@/lib/meta-capi";
import {
  createPortalToken,
  portalMagicLinkUrl,
} from "@/lib/portal-auth";
import { vehicleLabel } from "@/lib/status";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merk, model, timing, richtprijs, naam, email, telefoon, woonplaats } =
      body;

    if (!merk || !timing || !naam || !email || !telefoon) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in." },
        { status: 400 },
      );
    }

    const parsedRichtprijs =
      richtprijs === undefined || richtprijs === null || richtprijs === ""
        ? null
        : Number(richtprijs);
    if (
      parsedRichtprijs != null &&
      (!Number.isFinite(parsedRichtprijs) || parsedRichtprijs <= 0)
    ) {
      return NextResponse.json(
        { error: "Vul een geldige richtprijs in." },
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
      richtprijs: parsedRichtprijs,
      naam: String(naam).trim(),
      email: String(email).trim(),
      telefoon: String(telefoon).trim(),
      woonplaats:
        typeof woonplaats === "string" ? woonplaats.trim() : "",
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

    // Welkomstmail + portaal link — await zodat serverless de mail niet killt
    let portalPath: string | null = null;
    try {
      const portalToken = await createPortalToken(lead.id, lead.email);
      portalPath = `/mijn/${encodeURIComponent(portalToken)}`;
      const magicUrl = portalMagicLinkUrl(portalToken);
      const mail = portalWelcomeEmail({
        toName: lead.naam,
        vehicleLabel: vehicleLabel(lead.merk, lead.model),
        magicUrl,
      });
      const sent = await sendEmail({
        to: lead.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      console.info("[portal:welcome]", {
        leadId: lead.id,
        ok: sent.ok,
        mode: sent.mode,
        error: sent.error,
      });
    } catch (mailErr) {
      console.error("[portal:welcome]", mailErr);
    }

    return NextResponse.json({
      ok: true,
      id: lead.id,
      metaEventId,
      portalUrl: portalPath,
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
