import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmCreateBuyer, crmListBuyers } from "@/lib/crm";
import {
  createDealerInviteToken,
  dealerInviteLoginUrl,
} from "@/lib/dealer-auth";
import { dealerInviteEmail, sendEmail } from "@/lib/email";
import { mpListPublic } from "@/lib/marketplace-data";

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

  const email = body.email ? String(body.email).trim() : "";
  const sendInvite = Boolean(body.sendInvite);
  const dealerPassword = body.dealerPassword
    ? String(body.dealerPassword)
    : null;

  if (sendInvite && !email.includes("@")) {
    return NextResponse.json(
      { error: "E-mail is verplicht om een uitnodiging te sturen" },
      { status: 400 },
    );
  }

  if (body.dealerUsername && !dealerPassword && !sendInvite) {
    return NextResponse.json(
      { error: "Wachtwoord verplicht bij dealer-login zonder uitnodiging" },
      { status: 400 },
    );
  }

  try {
    const dealerUsername = sendInvite
      ? email
      : body.dealerUsername
        ? String(body.dealerUsername).trim()
        : dealerPassword && email
          ? email
          : null;

    const buyer = await crmCreateBuyer({
      naam: String(body.naam).trim(),
      bedrijf: String(body.bedrijf).trim(),
      email: email || null,
      telefoon: body.telefoon ? String(body.telefoon).trim() : null,
      dealerUsername,
      dealerPassword: sendInvite ? null : dealerPassword,
      dealerEnabled: sendInvite
        ? true
        : body.dealerEnabled !== false && Boolean(dealerUsername),
      pendingInvite: sendInvite,
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
    if (sendInvite && dealerUsername) {
      const to = (buyer.email || dealerUsername).trim();
      const listings = await mpListPublic().catch(() => []);
      const token = await createDealerInviteToken({
        email: dealerUsername,
        buyerId: buyer.id,
      });
      const mail = dealerInviteEmail({
        bedrijf: buyer.bedrijf,
        email: dealerUsername,
        loginUrl: dealerInviteLoginUrl(token),
        dealCount: listings.length,
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

    return NextResponse.json({ ...buyer, inviteSent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mislukt" },
      { status: 500 },
    );
  }
}
