import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getCompanyInfo } from "@/lib/company";
import { crmGetBuyerRow } from "@/lib/crm";
import {
  buildInvoicePdf,
  invoicePdfFilename,
} from "@/lib/invoice-pdf";
import {
  crmGetInvoice,
  crmGetInvoiceSettings,
} from "@/lib/invoices";

export async function GET(
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

    const buyer = await crmGetBuyerRow(invoice.buyerId);
    if (!buyer) {
      return NextResponse.json({ error: "Koper niet gevonden" }, { status: 404 });
    }

    const settings = await crmGetInvoiceSettings(invoice.buyerId);
    const pdfBytes = await buildInvoicePdf(
      invoice,
      {
        naam: buyer.naam,
        bedrijf: buyer.bedrijf,
        email: buyer.email,
        telefoon: buyer.telefoon,
      },
      settings,
      getCompanyInfo(),
    );

    const filename = invoicePdfFilename(invoice);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
