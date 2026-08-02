import { getCompanyInfo } from "./company";

export type EmailAttachment = {
  filename: string;
  /** Raw bytes or already base64-encoded content */
  content: Uint8Array | Buffer | string;
  contentType?: string;
};

type SendEmailInput = {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  ok: boolean;
  mode: "postmark" | "resend" | "demo" | "log";
  error?: string;
  messageId?: string;
};

const CONTRACT_BCC =
  process.env.CONTRACT_BCC_EMAIL?.trim() || "jonahessel911@gmail.com";

function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      list
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
    ),
  ];
}

function toBase64(content: Uint8Array | Buffer | string): string {
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
}

function emailFromAddress(): string {
  return (
    process.env.POSTMARK_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    `${getCompanyInfo().name} <${getCompanyInfo().email}>`
  );
}

/**
 * Stuurt e-mail via Postmark (voorkeur) of Resend.
 * Zonder keys: demo/log.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = emailFromAddress();
  const to = asList(input.to);
  const bcc = asList(input.bcc);

  if (to.length === 0) {
    return { ok: false, mode: "log", error: "Geen ontvanger (to) opgegeven" };
  }

  if (postmarkToken) {
    try {
      const payload: Record<string, unknown> = {
        From: from,
        To: to.join(", "),
        Subject: input.subject,
        TextBody: input.text,
        HtmlBody: input.html ?? `<pre>${input.text}</pre>`,
        MessageStream:
          process.env.POSTMARK_MESSAGE_STREAM?.trim() || "outbound",
      };
      if (bcc.length) payload.Bcc = bcc.join(", ");
      if (input.attachments?.length) {
        payload.Attachments = input.attachments.map((a) => ({
          Name: a.filename,
          Content: toBase64(a.content),
          ContentType: a.contentType || "application/octet-stream",
        }));
      }

      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": postmarkToken,
        },
        body: JSON.stringify(payload),
      });
      const bodyText = await res.text();
      let bodyJson: { MessageID?: string; Message?: string } = {};
      try {
        bodyJson = JSON.parse(bodyText) as {
          MessageID?: string;
          Message?: string;
        };
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        return {
          ok: false,
          mode: "postmark",
          error: `Postmark fout (${res.status}): ${(bodyJson.Message || bodyText).slice(0, 200)}`,
        };
      }
      return {
        ok: true,
        mode: "postmark",
        messageId: bodyJson.MessageID,
      };
    } catch (err) {
      return {
        ok: false,
        mode: "postmark",
        error: err instanceof Error ? err.message : "E-mail mislukt",
      };
    }
  }

  if (resendKey) {
    try {
      const payload: Record<string, unknown> = {
        from,
        to,
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre>${input.text}</pre>`,
      };
      if (bcc.length) payload.bcc = bcc;
      if (input.attachments?.length) {
        payload.attachments = input.attachments.map((a) => ({
          filename: a.filename,
          content: toBase64(a.content),
          ...(a.contentType ? { content_type: a.contentType } : {}),
        }));
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
    to,
    bcc: bcc.length ? bcc : undefined,
    subject: input.subject,
    text: input.text,
    attachments: input.attachments?.map((a) => a.filename),
  });
  return { ok: true, mode: "demo" };
}

export function contractSendEmail(opts: {
  sellerName: string;
  dealerName: string;
  machineLabel: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Koopovereenkomst ${opts.machineLabel} – ${company.name}`;
  const text = [
    `Beste ${opts.sellerName} en ${opts.dealerName},`,
    "",
    `In de bijlage vindt u de koopovereenkomst voor ${opts.machineLabel}.`,
    "",
    "Deze mail is verstuurd aan zowel de verkoper als de gekoppelde handelaar.",
    "",
    "Met vriendelijke groet,",
    company.legalName,
    company.phone,
    company.email,
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.sellerName)} en ${escapeHtml(opts.dealerName)},</p>
      <p>In de bijlage vindt u de <strong>koopovereenkomst</strong> voor
      <strong>${escapeHtml(opts.machineLabel)}</strong>.</p>
      <p>Deze mail is verstuurd aan zowel de verkoper als de gekoppelde handelaar.</p>
      <p style="color:#706e6b;font-size:13px">${escapeHtml(company.legalName)} · ${escapeHtml(company.phone)} · ${escapeHtml(company.email)}</p>
    </div>
  `;

  return { subject, text, html };
}

/** BCC bij versturen van koopcontracten */
export function contractBccEmail(): string {
  return CONTRACT_BCC;
}

export function marketplaceShareEmail(opts: {
  toName: string;
  listingTitle: string;
  woonplaats: string;
  url: string;
  endsAt: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const ends = new Date(opts.endsAt).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
  });
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
