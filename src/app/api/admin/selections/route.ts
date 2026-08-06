import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { ensureBuyerForSelectionRecipient } from "@/lib/buyer-from-email";
import { crmGetLead } from "@/lib/crm";
import { dealerSelectionShareEmail, sendEmail } from "@/lib/email";
import {
  crmCreateSelection,
  crmListSelectionsAdmin,
  selectionPublicUrl,
} from "@/lib/selections";
import { vehicleLabel } from "@/lib/status";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const selections = await crmListSelectionsAdmin();
    return NextResponse.json(selections);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const naam = String(body.naam ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const greetingName = String(body.greetingName ?? "").trim();
    const requestedBuyerId =
      typeof body.buyerId === "string" ? body.buyerId.trim() : "";
    const leadIds = Array.isArray(body.leadIds)
      ? body.leadIds.map((id: unknown) => String(id))
      : [];

    if (!naam) {
      return NextResponse.json(
        { error: "Geef de selectie een naam" },
        { status: 400 },
      );
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geldig e-mailadres is verplicht" },
        { status: 400 },
      );
    }
    if (leadIds.length === 0) {
      return NextResponse.json(
        { error: "Selecteer minstens één heftruck" },
        { status: 400 },
      );
    }

    const labels: string[] = [];
    for (const id of leadIds) {
      const lead = await crmGetLead(id);
      if (!lead) {
        return NextResponse.json(
          { error: `Lead niet gevonden: ${id}` },
          { status: 404 },
        );
      }
      labels.push(vehicleLabel(lead.merk, lead.model));
    }

    const ensured = await ensureBuyerForSelectionRecipient({
      email,
      greetingName: greetingName || null,
      buyerId: requestedBuyerId || null,
    });

    const selection = await crmCreateSelection({
      naam,
      leadIds,
      buyerId: ensured.buyer.id,
      recipientEmail: email,
      recipientNaam: greetingName || ensured.buyer.bedrijf || null,
      createdByUserId: session.userId,
      createdByNaam: session.naam,
    });
    const url = selectionPublicUrl(selection.slug);

    const mail = dealerSelectionShareEmail({
      greetingName: greetingName || ensured.buyer.bedrijf,
      selectionNaam: selection.naam,
      vehicleLabels: labels,
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
        {
          error: sent.error || "E-mail versturen mislukt",
          selection,
          url,
          buyer: ensured.buyer,
          buyerCreated: ensured.created,
        },
        { status: 502 },
      );
    }

    const buyerNote = ensured.created
      ? ` · koper “${ensured.buyer.bedrijf}” automatisch geregistreerd (geen login)`
      : ` · gekoppeld aan koper “${ensured.buyer.bedrijf}”`;

    return NextResponse.json({
      ok: true,
      mode: sent.mode,
      selection,
      url,
      buyer: ensured.buyer,
      buyerCreated: ensured.created,
      matchedBy: ensured.matchedBy,
      message:
        sent.mode === "demo"
          ? `Demo: selectie aangemaakt. Link: ${url}${buyerNote}`
          : `Selectie “${selection.naam}” verstuurd naar ${email}${buyerNote}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
