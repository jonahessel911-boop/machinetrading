import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-auth";
import {
  crmGetInvoiceSettings,
  crmUpdateInvoiceSettings,
} from "@/lib/invoices";

export async function GET() {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await crmGetInvoiceSettings(dealer.buyerId);
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await crmUpdateInvoiceSettings(dealer.buyerId, {
      invoiceBedrijf: body.invoiceBedrijf,
      invoiceContact: body.invoiceContact,
      invoiceEmail: body.invoiceEmail,
      invoiceTelefoon: body.invoiceTelefoon,
      invoiceStraat: body.invoiceStraat,
      invoiceHuisnummer: body.invoiceHuisnummer,
      invoicePostcode: body.invoicePostcode,
      invoiceWoonplaats: body.invoiceWoonplaats,
      invoiceLand: body.invoiceLand,
      invoiceKvk: body.invoiceKvk,
      invoiceBtw: body.invoiceBtw,
      invoiceIban: body.invoiceIban,
      invoiceBic: body.invoiceBic,
    });
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Opslaan mislukt" },
      { status: 500 },
    );
  }
}
