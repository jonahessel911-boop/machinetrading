import { NextResponse } from "next/server";
import { getCompanyInfo } from "@/lib/company";
import { buildContractPdf } from "@/lib/contract-pdf";
import { crmGetBuyerRow, crmGetLead } from "@/lib/crm";
import { getPortalSession } from "@/lib/portal-auth";

type Params = { params: Promise<{ contractId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractId } = await params;

  try {
    const lead = await crmGetLead(session.leadId);
    if (!lead) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }
    if (lead.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contract = (lead.contracts ?? []).find((c) => c.id === contractId);
    if (!contract) {
      return NextResponse.json(
        { error: "Contract niet gevonden" },
        { status: 404 },
      );
    }
    if (contract.status !== "verstuurd" && contract.status !== "getekend") {
      return NextResponse.json(
        { error: "Contract nog niet beschikbaar" },
        { status: 403 },
      );
    }

    const buyer =
      contract.buyer ??
      (await crmGetBuyerRow(contract.buyerId).then((row) =>
        row
          ? {
              id: row.id,
              naam: row.naam,
              email: row.email,
              telefoon: row.telefoon,
              bedrijf: row.bedrijf,
            }
          : null,
      ));

    if (!buyer) {
      return NextResponse.json(
        { error: "Kopergegevens ontbreken" },
        { status: 404 },
      );
    }

    if (lead.inkoopprijs == null) {
      return NextResponse.json(
        { error: "Contractprijs ontbreekt" },
        { status: 400 },
      );
    }

    const pdfBytes = await buildContractPdf(
      {
        id: lead.id,
        naam: lead.naam,
        email: lead.email,
        telefoon: lead.telefoon,
        straat: lead.straat,
        huisnummer: lead.huisnummer,
        toevoeging: lead.toevoeging,
        postcode: lead.postcode,
        woonplaats: lead.woonplaats,
        merk: lead.merk,
        model: lead.model,
        timing: lead.timing,
        inkoopprijs: lead.inkoopprijs,
        dealDatum: lead.dealDatum,
        bedrijfsnaam: lead.bedrijfsnaam,
      },
      {
        naam: buyer.naam,
        email: buyer.email,
        telefoon: buyer.telefoon,
        bedrijf: buyer.bedrijf,
      },
      getCompanyInfo(),
    );

    const filenameBase = [lead.merk, lead.model]
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const filename = `Koopovereenkomst-${filenameBase || lead.id}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[portal:contract]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF mislukt" },
      { status: 500 },
    );
  }
}
