import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmGetLead, crmUpdateLead } from "@/lib/crm";
import { dealerDirectShareEmail, sendEmail } from "@/lib/email";
import { createLeadShareToken, leadShareUrl } from "@/lib/lead-share";
import {
  mpSearchBuyers,
  mpSyncOmschrijvingForLead,
  mpTopBuyers,
} from "@/lib/marketplace-data";
import { vehicleLabel } from "@/lib/status";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  try {
    const buyers = q ? await mpSearchBuyers(q) : await mpTopBuyers(10);
    return NextResponse.json(buyers);
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
  const leadId = String(body.leadId ?? "");
  const email = String(body.email ?? "").trim();
  const greetingName = String(body.greetingName ?? body.toName ?? "").trim();
  const linkOnly = Boolean(body.linkOnly);
  const omschrijvingFromForm =
    typeof body.omschrijving === "string"
      ? body.omschrijving.trim().slice(0, 2000)
      : null;

  if (!leadId) {
    return NextResponse.json({ error: "leadId is verplicht" }, { status: 400 });
  }
  if (!linkOnly && (!email || !email.includes("@"))) {
    return NextResponse.json(
      { error: "leadId en geldig e-mailadres zijn verplicht" },
      { status: 400 },
    );
  }

  try {
    if (omschrijvingFromForm !== null) {
      await crmUpdateLead(leadId, {
        omschrijving: omschrijvingFromForm || null,
      });
      await mpSyncOmschrijvingForLead(leadId, omschrijvingFromForm || null);
    }

    const lead = await crmGetLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const omschrijving =
      omschrijvingFromForm !== null
        ? omschrijvingFromForm || null
        : lead.omschrijving ?? null;

    const token = await createLeadShareToken(lead.id);
    const url = leadShareUrl(token);

    if (linkOnly) {
      return NextResponse.json({
        ok: true,
        url,
        message: "Preview-link klaar om te kopiëren",
      });
    }

    const label = vehicleLabel(lead.merk, lead.model);

    const mail = dealerDirectShareEmail({
      greetingName,
      vehicleLabel: label,
      woonplaats: lead.woonplaats || "",
      omschrijving,
      url,
    });

    const sent = await sendEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error || "E-mail versturen mislukt" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: sent.mode,
      url,
      message:
        sent.mode === "demo"
          ? `Demo: e-mail gesimuleerd naar ${email}. Deel-link: ${url}`
          : `E-mail verstuurd naar ${email}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
