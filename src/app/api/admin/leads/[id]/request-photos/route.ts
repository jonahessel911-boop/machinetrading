import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmGetLead } from "@/lib/crm";
import { portalRequestPhotosEmail, sendEmail } from "@/lib/email";
import {
  createPortalToken,
  portalMagicLinkUrl,
} from "@/lib/portal-auth";
import { vehicleLabel } from "@/lib/status";

type Params = { params: Promise<{ id: string }> };

/** Admin: stuur klant een mail om foto's te uploaden via het portaal. */
export async function POST(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const email = lead.email?.trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Lead heeft geen geldig e-mailadres" },
        { status: 400 },
      );
    }

    const token = await createPortalToken(lead.id, email);
    const magicUrl = portalMagicLinkUrl(token);
    const label = vehicleLabel(lead.merk, lead.model);
    const mail = portalRequestPhotosEmail({
      toName: lead.naam,
      vehicleLabel: label,
      magicUrl,
    });

    const sent = await sendEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      console.error("[admin:request-photos]", sent.error);
      return NextResponse.json(
        { error: sent.error || "E-mail versturen mislukt" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: sent.mode,
      to: email,
    });
  } catch (err) {
    console.error("[admin:request-photos]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
