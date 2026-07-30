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
import {
  contractBccEmail,
  contractSendEmail,
  sendEmail,
} from "@/lib/email";
import { crmEnsureDraftInvoiceForDeal } from "@/lib/invoices";
import { mpUnpublishForLead } from "@/lib/marketplace-data";
import {
  clientContextFromRequest,
  readMetaCookiesFromHeader,
  sendMetaDealEvent,
} from "@/lib/meta-capi";

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

    const sellerEmail = lead.email?.trim() || "";
    const dealerEmail = buyer.email?.trim() || "";
    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Verkoper heeft geen e-mailadres" },
        { status: 400 },
      );
    }
    if (!dealerEmail) {
      return NextResponse.json(
        {
          error:
            "Handelaar heeft geen e-mailadres. Vul dit in bij de koper voordat je het contract verstuurt.",
        },
        { status: 400 },
      );
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
        bedrijfsnaam: lead.bedrijfsnaam ?? null,
      },
      {
        naam: buyer.naam,
        email: buyer.email,
        telefoon: buyer.telefoon,
        bedrijf: buyer.bedrijf,
      },
      getCompanyInfo(),
    );

    const machine = [lead.merk, lead.model].filter(Boolean).join(" ").trim();
    const machineLabel = machine || "heftruck";
    const dealerName = buyer.bedrijf?.trim() || buyer.naam;
    const mail = contractSendEmail({
      sellerName: lead.naam,
      dealerName,
      machineLabel,
    });
    const filenameBase = [lead.merk, lead.model]
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const pdfFilename = `Koopovereenkomst-${filenameBase || lead.id}.pdf`;

    const sent = await sendEmail({
      to: [sellerEmail, dealerEmail],
      bcc: contractBccEmail(),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBytes,
          contentType: "application/pdf",
        },
      ],
    });
    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error || "Contract-e-mail versturen mislukt" },
        { status: 502 },
      );
    }

    const contract = await crmInsertContract({
      leadId: lead.id,
      buyerId: buyer.id,
    });

    await mpUnpublishForLead(lead.id);

    const draftInvoice = await crmEnsureDraftInvoiceForDeal({
      buyerId: buyer.id,
      leadId: lead.id,
      amountExBtw: Number(lead.marge) || 0,
      description: machine
        ? `Bemiddelingsfee deal ${machine}`
        : `Bemiddelingsfee deal ${lead.naam}`,
    });

    const ctx = await clientContextFromRequest(request);
    const cookieMeta = readMetaCookiesFromHeader(request.headers.get("cookie"));
    void sendMetaDealEvent({
      leadId: lead.id,
      contractId: contract.id,
      email: lead.email,
      phone: lead.telefoon,
      naam: lead.naam,
      woonplaats: lead.woonplaats,
      merk: lead.merk,
      model: lead.model,
      value: lead.marge ?? lead.inkoopprijs ?? 0,
      eventSourceUrl:
        request.headers.get("referer") ||
        `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.heftruckverkocht.nl"}/admin/leads/${lead.id}/deal`,
      fbp: cookieMeta.fbp,
      fbc: cookieMeta.fbc,
      clientIpAddress: ctx.clientIpAddress,
      clientUserAgent: ctx.clientUserAgent,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename}"`,
        "X-Contract-Id": contract.id,
        "X-Email-To": `${sellerEmail}, ${dealerEmail}`,
        "X-Email-Bcc": contractBccEmail(),
        "X-Email-Mode": sent.mode,
        "X-Meta-Event-Id": `deal-${contract.id}`,
        ...(draftInvoice ? { "X-Invoice-Id": draftInvoice.id } : {}),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
