import { getCompanyInfo } from "./company";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  ok: boolean;
  mode: "resend" | "demo" | "log";
  error?: string;
};

/**
 * Stuurt e-mail via Resend als RESEND_API_KEY gezet is.
 * Anders demo/log (toast toont link; handelaar-mail is gesimuleerd).
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ??
    `${getCompanyInfo().name} <${getCompanyInfo().email}>`;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html ?? `<pre>${input.text}</pre>`,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          mode: "resend",
          error: `Resend fout (${res.status}): ${body.slice(0, 160)}`,
        };
      }
      return { ok: true, mode: "resend" };
    } catch (err) {
      return {
        ok: false,
        mode: "resend",
        error: err instanceof Error ? err.message : "E-mail mislukt",
      };
    }
  }

  console.info("[email:demo]", {
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { ok: true, mode: "demo" };
}

export function marketplaceShareEmail(opts: {
  toName: string;
  listingTitle: string;
  woonplaats: string;
  url: string;
  endsAt: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const ends = new Date(opts.endsAt).toLocaleString("nl-NL");
  const subject = `Heftruck te koop: ${opts.listingTitle} (${opts.woonplaats})`;
  const text = [
    `Beste ${opts.toName},`,
    "",
    `Er staat een heftruck voor je klaar op de marketplace van ${company.name}:`,
    "",
    `${opts.listingTitle}`,
    `Locatie: ${opts.woonplaats}`,
    `Veiling open tot: ${ends}`,
    "",
    `Bekijk en bied: ${opts.url}`,
    "",
    "Met vriendelijke groet,",
    company.legalName,
    company.phone,
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Er staat een heftruck voor je klaar op de marketplace van <strong>${escapeHtml(company.name)}</strong>:</p>
      <p style="font-size:16px;font-weight:700">${escapeHtml(opts.listingTitle)}<br/>
      <span style="font-weight:400;color:#514f4d">Locatie: ${escapeHtml(opts.woonplaats)} · open tot ${escapeHtml(ends)}</span></p>
      <p><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700">Bekijk & bied</a></p>
      <p style="color:#706e6b;font-size:13px">${escapeHtml(company.legalName)} · ${escapeHtml(company.phone)}</p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
