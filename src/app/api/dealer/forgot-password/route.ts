import { NextResponse } from "next/server";
import { crmFindDealerByUsername } from "@/lib/crm";
import {
  createDealerResetToken,
  dealerResetPasswordUrl,
} from "@/lib/dealer-auth";
import { dealerResetPasswordEmail, sendEmail } from "@/lib/email";
import { mapBuyer } from "@/lib/mappers";

/**
 * Stuur reset-link. Antwoord altijd hetzelfde (geen account-lek).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    const okResponse = NextResponse.json({
      ok: true,
      message:
        "Als dit e-mailadres bij ons bekend is, ontvang je zo een link om je wachtwoord te wijzigen.",
    });

    if (!email.includes("@")) {
      return okResponse;
    }

    const row = await crmFindDealerByUsername(email);
    if (!row?.dealer_password_hash || !row.dealer_enabled) {
      return okResponse;
    }

    const buyer = mapBuyer(row);
    const token = await createDealerResetToken({
      email: row.dealer_username || email,
      buyerId: buyer.id,
    });
    const mail = dealerResetPasswordEmail({
      bedrijf: buyer.bedrijf,
      email: row.dealer_username || email,
      resetUrl: dealerResetPasswordUrl(token),
    });
    const to = (buyer.email || row.dealer_username || email).trim();
    const sent = await sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (!sent.ok) {
      console.error("[dealer:forgot-password]", sent.error);
      return NextResponse.json(
        { error: "Mail versturen mislukt. Probeer het later opnieuw." },
        { status: 500 },
      );
    }

    return okResponse;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Kon reset-mail niet versturen",
      },
      { status: 500 },
    );
  }
}
