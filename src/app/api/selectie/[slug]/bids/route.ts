import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-auth";
import { crmGetLead } from "@/lib/crm";
import {
  bidNotifyTo,
  bidPlacedNotifyEmail,
  sendEmail,
} from "@/lib/email";
import {
  crmListBidsForSelection,
  crmPlaceLeadBid,
} from "@/lib/lead-bids";
import { crmGetSelectionBySlug } from "@/lib/selections";
import { vehicleLabel } from "@/lib/status";

function normalizeBedrijf(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function adminSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.heftruckverkocht.nl"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: raw } = await params;
    const slug = decodeURIComponent(raw);
    const selection = await crmGetSelectionBySlug(slug);
    if (!selection) {
      return NextResponse.json({ error: "Selectie niet gevonden" }, { status: 404 });
    }

    const session = await getDealerSession();
    const bids = await crmListBidsForSelection({
      selectionId: selection.id,
      leadIds: selection.leadIds,
    });

    const publicBids = bids.map((b) => ({
      leadId: b.leadId,
      bedrag: b.bedrag,
      bedrijf: b.bidderBedrijf || b.bidderNaam,
      createdAt: b.createdAt,
      mine: Boolean(
        (session?.buyerId && b.buyerId === session.buyerId) ||
          (session?.bedrijf &&
            normalizeBedrijf(session.bedrijf) ===
              normalizeBedrijf(b.bidderBedrijf || b.bidderNaam || "")),
      ),
    }));

    return NextResponse.json({ bids: publicBids });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: raw } = await params;
    const slug = decodeURIComponent(raw);
    const selection = await crmGetSelectionBySlug(slug);
    if (!selection) {
      return NextResponse.json({ error: "Selectie niet gevonden" }, { status: 404 });
    }

    const body = (await request.json()) as {
      leadId?: string;
      bedrag?: number;
      bedrijf?: string;
    };

    const leadId = String(body.leadId ?? "").trim();
    if (!leadId || !selection.leadIds.includes(leadId)) {
      return NextResponse.json(
        { error: "Deze heftruck hoort niet bij deze selectie" },
        { status: 400 },
      );
    }

    const session = await getDealerSession();
    const bedrijf = (body.bedrijf ?? session?.bedrijf ?? "").trim();

    const bid = await crmPlaceLeadBid({
      leadId,
      selectionId: selection.id,
      buyerId: session?.buyerId ?? null,
      bidderNaam: session?.naam || bedrijf,
      bidderEmail: session?.email ?? null,
      bidderTelefoon: session?.telefoon ?? null,
      bidderBedrijf: bedrijf,
      bedrag: Number(body.bedrag),
    });

    try {
      const lead = await crmGetLead(leadId);
      const machineLabel = lead
        ? vehicleLabel(lead.merk, lead.model)
        : "Heftruck";
      const mail = bidPlacedNotifyEmail({
        source: "selectie",
        machineLabel,
        bedrag: bid.bedrag,
        bedrijf: bid.bidderBedrijf || bid.bidderNaam,
        bidderNaam: bid.bidderNaam,
        bidderEmail: bid.bidderEmail,
        bidderTelefoon: bid.bidderTelefoon,
        selectionNaam: selection.naam,
        adminUrl: `${adminSiteUrl()}/admin/leads/${leadId}`,
      });
      const sent = await sendEmail({
        to: bidNotifyTo(),
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      if (!sent.ok) {
        console.error("[selectie:bid:notify]", sent.error);
      }
    } catch (notifyErr) {
      console.error("[selectie:bid:notify]", notifyErr);
    }

    return NextResponse.json({
      ok: true,
      bedrag: bid.bedrag,
      bedrijf: bid.bidderBedrijf || bid.bidderNaam,
      message: "Bod ontvangen — bedankt!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bod mislukt" },
      { status: 400 },
    );
  }
}
