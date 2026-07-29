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

export function invoiceSendEmail(opts: {
  toName: string;
  invoiceNumber: string;
  description: string | null;
  amountExBtw: number;
  btwPct: number;
  btwAmount: number;
  amountIncBtw: number;
  issueDate: string;
  dueDate: string | null;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const fmt = (n: number) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(n);
  const subject = `Factuur ${opts.invoiceNumber} – ${company.name}`;
  const lines = [
    `Beste ${opts.toName},`,
    "",
    `Hierbij ontvangt u factuur ${opts.invoiceNumber} van ${company.legalName}.`,
    "",
    opts.description ? `Omschrijving: ${opts.description}` : null,
    `Factuurdatum: ${opts.issueDate}`,
    opts.dueDate ? `Vervaldatum: ${opts.dueDate}` : null,
    "",
    `Bedrag excl. BTW: ${fmt(opts.amountExBtw)}`,
    `BTW (${opts.btwPct}%): ${fmt(opts.btwAmount)}`,
    `Totaal incl. BTW: ${fmt(opts.amountIncBtw)}`,
    "",
    "Met vriendelijke groet,",
    company.legalName,
    company.phone,
    company.email,
  ].filter((l): l is string => l != null);

  const text = lines.join("\n");
  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Hierbij ontvangt u factuur <strong>${escapeHtml(opts.invoiceNumber)}</strong> van ${escapeHtml(company.legalName)}.</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
        ${opts.description ? `<tr><td style="padding:4px 12px 4px 0;color:#706e6b">Omschrijving</td><td>${escapeHtml(opts.description)}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;color:#706e6b">Factuurdatum</td><td>${escapeHtml(opts.issueDate)}</td></tr>
        ${opts.dueDate ? `<tr><td style="padding:4px 12px 4px 0;color:#706e6b">Vervaldatum</td><td>${escapeHtml(opts.dueDate)}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;color:#706e6b">Excl. BTW</td><td>${escapeHtml(fmt(opts.amountExBtw))}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#706e6b">BTW (${opts.btwPct}%)</td><td>${escapeHtml(fmt(opts.btwAmount))}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#706e6b;font-weight:700">Totaal</td><td style="font-weight:700">${escapeHtml(fmt(opts.amountIncBtw))}</td></tr>
      </table>
      <p style="color:#706e6b;font-size:13px">${escapeHtml(company.legalName)} · ${escapeHtml(company.phone)} · ${escapeHtml(company.email)}</p>
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
