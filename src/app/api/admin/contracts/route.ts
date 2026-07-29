import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getCompanyInfo } from "@/lib/company";
import { buildContractPdf } from "@/lib/contract-pdf";
import {
  crmGetBuyerRow,
  crmGetLeadRow,
  crmInsertContract,
  crmUpdateLead,
} from "@/lib/crm";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const leadId = String(body.leadId ?? "");
  const buyerId = body.buyerId ? String(body.buyerId) : null;

  try {
    const lead = await crmGetLeadRow(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const resolvedBuyerId = buyerId || lead.buyer_id;
    if (!resolvedBuyerId) {
      return NextResponse.json(
        { error: "Koppel eerst een koper/handelaar" },
        { status: 400 },
      );
    }

    if (!lead.postcode || !lead.huisnummer || !lead.straat || !lead.woonplaats) {
      return NextResponse.json(
        {
          error:
            "Compleet adres verplicht (straat, huisnr, postcode, woonplaats). Gebruik de postcode-lookup op de deal-pagina.",
        },
        { status: 400 },
      );
    }

    if (lead.inkoopprijs == null) {
      return NextResponse.json(
        { error: "Bruto inkoopprijs is verplicht voor het contract" },
        { status: 400 },
      );
    }

    const buyer = await crmGetBuyerRow(resolvedBuyerId);
    if (!buyer) {
      return NextResponse.json({ error: "Koper niet gevonden" }, { status: 404 });
    }

    if (!lead.buyer_id) {
      await crmUpdateLead(lead.id, { buyer_id: buyer.id });
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
        dealDatum: lead.deal_datum,
      },
      {
        naam: buyer.naam,
        email: buyer.email,
        telefoon: buyer.telefoon,
        bedrijf: buyer.bedrijf,
      },
      getCompanyInfo(),
    );

    const contract = await crmInsertContract({
      leadId: lead.id,
      buyerId: buyer.id,
    });

    const safeName = [lead.merk, lead.model]
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9-_]/g, "");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Koopovereenkomst-${safeName || contract.id}.pdf"`,
        "X-Contract-Id": contract.id,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
