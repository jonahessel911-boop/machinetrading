import { NextResponse } from "next/server";
import { crmFindLeadsByEmail } from "@/lib/crm";
import { portalMagicLinkEmail, sendEmail } from "@/lib/email";
import {
  createPortalToken,
  portalMagicLinkUrl,
} from "@/lib/portal-auth";
import { vehicleLabel } from "@/lib/status";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Vul een geldig e-mailadres in." },
        { status: 400 },
      );
    }

    const leads = await crmFindLeadsByEmail(email, 5);

    // Altijd zelfde response (geen e-mail enumeration)
    if (leads.length === 0) {
      return NextResponse.json({
        ok: true,
        message:
          "Als we een aanmelding met dit e-mailadres vinden, sturen we je een link.",
      });
    }

    // Stuur link voor de nieuwste lead (meest relevant)
    const lead = leads[0];
    const token = await createPortalToken(lead.id, lead.email);
    const magicUrl = portalMagicLinkUrl(token);
    const mail = portalMagicLinkEmail({
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

    if (!sent.ok) {
      console.error("[portal:login]", sent.error);
      return NextResponse.json(
        { error: "Kon de e-mail niet versturen. Probeer het later opnieuw." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Check je inbox — we hebben een link gestuurd.",
    });
  } catch (err) {
    console.error("[portal:login]", err);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het later opnieuw." },
      { status: 500 },
    );
  }
}
