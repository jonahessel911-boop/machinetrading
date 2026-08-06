import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmCreateBuyer, crmListBuyers } from "@/lib/crm";
import {
  createDealerInviteToken,
  dealerInviteLoginUrl,
} from "@/lib/dealer-auth";
import { dealerInviteEmail, sendEmail } from "@/lib/email";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buyers = await crmListBuyers();
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
  if (!body.naam || !body.bedrijf) {
    return NextResponse.json(
      { error: "Naam en bedrijf zijn verplicht" },
      { status: 400 },
    );
  }

  if (body.dealerUsername && !body.dealerPassword) {
    return NextResponse.json(
      { error: "Wachtwoord verplicht bij dealer-login" },
      { status: 400 },
    );
  }

  try {
    const dealerPassword = body.dealerPassword
      ? String(body.dealerPassword)
      : null;
    const dealerUsername = body.dealerUsername
      ? String(body.dealerUsername).trim()
      : null;

    const buyer = await crmCreateBuyer({
      naam: String(body.naam).trim(),
      bedrijf: String(body.bedrijf).trim(),
      email: body.email ? String(body.email).trim() : null,
      telefoon: body.telefoon ? String(body.telefoon).trim() : null,
      dealerUsername,
      dealerPassword,
      dealerEnabled: body.dealerEnabled !== false,
      invoice: body.invoice
        ? {
            invoiceBedrijf: body.invoice.invoiceBedrijf,
            invoiceContact: body.invoice.invoiceContact,
            invoiceEmail: body.invoice.invoiceEmail,
            invoiceTelefoon: body.invoice.invoiceTelefoon,
            invoiceStraat: body.invoice.invoiceStraat,
            invoiceHuisnummer: body.invoice.invoiceHuisnummer,
            invoicePostcode: body.invoice.invoicePostcode,
            invoiceWoonplaats: body.invoice.invoiceWoonplaats,
            invoiceLand: body.invoice.invoiceLand,
            invoiceKvk: body.invoice.invoiceKvk,
            invoiceBtw: body.invoice.invoiceBtw,
            invoiceIban: body.invoice.invoiceIban,
            invoiceBic: body.invoice.invoiceBic,
          }
        : undefined,
    });

    let inviteSent = false;
    if (dealerUsername && dealerPassword && buyer.dealerEnabled) {
      const to = (buyer.email || dealerUsername).trim();
      if (to.includes("@")) {
        const token = await createDealerInviteToken({
          email: dealerUsername,
          password: dealerPassword,
          buyerId: buyer.id,
        });
        const mail = dealerInviteEmail({
          bedrijf: buyer.bedrijf,
          email: dealerUsername,
          password: dealerPassword,
          loginUrl: dealerInviteLoginUrl(token),
        });
        const sent = await sendEmail({
          to,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
        if (!sent.ok) {
          return NextResponse.json(
            {
              ...buyer,
              inviteSent: false,
              inviteError: sent.error || "Uitnodigingsmail mislukt",
            },
            { status: 201 },
          );
        }
        inviteSent = true;
      }
    }

    return NextResponse.json({ ...buyer, inviteSent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mislukt" },
      { status: 500 },
    );
  }
}
