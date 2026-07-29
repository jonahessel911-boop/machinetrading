import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmGetBuyerRow } from "@/lib/crm";
import { invoiceSendEmail, sendEmail } from "@/lib/email";
import {
  crmGetInvoice,
  crmGetInvoiceSettings,
  crmUpdateInvoiceStatus,
} from "@/lib/invoices";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const invoice = await crmGetInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    }
    if (invoice.status !== "concept") {
      return NextResponse.json(
        { error: "Alleen draft-facturen kunnen worden verstuurd" },
        { status: 400 },
      );
    }

    const buyer = await crmGetBuyerRow(invoice.buyerId);
    if (!buyer) {
      return NextResponse.json({ error: "Koper niet gevonden" }, { status: 404 });
    }

    const settings = await crmGetInvoiceSettings(invoice.buyerId);
    const to =
      settings?.invoiceEmail?.trim() ||
      buyer.email?.trim() ||
      null;
    if (!to) {
      return NextResponse.json(
        {
          error:
            "Geen factuur-e-mail bij deze koper. Vul factuurgegevens of contact-e-mail in.",
        },
        { status: 400 },
      );
    }

    const toName =
      settings?.invoiceContact?.trim() ||
      settings?.invoiceBedrijf?.trim() ||
      buyer.naam ||
      buyer.bedrijf;

    const mail = invoiceSendEmail({
      toName,
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      amountExBtw: invoice.amountExBtw,
      btwPct: invoice.btwPct,
      btwAmount: invoice.btwAmount,
      amountIncBtw: invoice.amountIncBtw,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
    });

    const sent = await sendEmail({
      to,
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

    const updated = await crmUpdateInvoiceStatus(invoice.id, "verstuurd");
    return NextResponse.json({
      invoice: updated,
      email: { to, mode: sent.mode },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mislukt" },
      { status: 500 },
    );
  }
}
