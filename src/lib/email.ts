import {
  emailSignOffHtml,
  emailSignOffText,
  getCompanyInfo,
} from "./company";

export type EmailAttachment = {
  filename: string;
  /** Raw bytes or already base64-encoded content */
  content: Uint8Array | Buffer | string;
  contentType?: string;
};

type SendEmailInput = {
  to: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
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

/** Altijd dit From-adres — nooit een ander merk via env. */
const CANONICAL_FROM = "heftruckverkocht.nl <info@heftruckverkocht.nl>";
const CANONICAL_REPLY_TO = "info@heftruckverkocht.nl";

function emailFromAddress(): string {
  return CANONICAL_FROM;
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
  const replyTo = asList(input.replyTo);
  if (replyTo.length === 0) replyTo.push(CANONICAL_REPLY_TO);

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
      if (replyTo.length) payload.ReplyTo = replyTo.join(", ");
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
      if (replyTo.length) payload.reply_to = replyTo.length === 1 ? replyTo[0] : replyTo;
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
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.sellerName)} en ${escapeHtml(opts.dealerName)},</p>
      <p>In de bijlage vindt u de <strong>koopovereenkomst</strong> voor
      <strong>${escapeHtml(opts.machineLabel)}</strong>.</p>
      <p>Deze mail is verstuurd aan zowel de verkoper als de gekoppelde handelaar.</p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

/** BCC bij versturen van koopcontracten */
export function contractBccEmail(): string {
  return CONTRACT_BCC;
}

/** Notificatie bij nieuw handelaarsbod */
export function bidNotifyTo(): string {
  return (
    process.env.BID_NOTIFY_EMAIL?.trim() || "jonahessel911@gmail.com"
  );
}

export function bidPlacedNotifyEmail(opts: {
  source: "selectie" | "marketplace";
  machineLabel: string;
  bedrag: number;
  bedrijf: string;
  bidderNaam?: string | null;
  bidderEmail?: string | null;
  bidderTelefoon?: string | null;
  selectionNaam?: string | null;
  adminUrl?: string | null;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const bedragLabel = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(opts.bedrag);
  const via =
    opts.source === "selectie"
      ? `selectie${opts.selectionNaam ? ` “${opts.selectionNaam}”` : ""}`
      : "marketplace";
  const subject = `Nieuw bod ${bedragLabel} — ${opts.machineLabel}`;
  const lines = [
    `Er is een nieuw bod geplaatst via de ${via}.`,
    "",
    `Machine: ${opts.machineLabel}`,
    `Bod: ${bedragLabel}`,
    `Bedrijf: ${opts.bedrijf || "—"}`,
    opts.bidderNaam ? `Contact: ${opts.bidderNaam}` : null,
    opts.bidderEmail ? `E-mail: ${opts.bidderEmail}` : null,
    opts.bidderTelefoon ? `Tel: ${opts.bidderTelefoon}` : null,
    opts.adminUrl ? "" : null,
    opts.adminUrl ? `Bekijk in CRM: ${opts.adminUrl}` : null,
    "",
    emailSignOffText(company),
  ].filter((l): l is string => l != null);

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Er is een <strong>nieuw bod</strong> geplaatst via de ${escapeHtml(via)}.</p>
      <p style="font-size:16px">
        <strong>${escapeHtml(opts.machineLabel)}</strong><br/>
        <span style="font-size:22px;font-weight:700;color:#ff7a00">${escapeHtml(bedragLabel)}</span>
      </p>
      <p>
        <strong>Bedrijf:</strong> ${escapeHtml(opts.bedrijf || "—")}<br/>
        ${opts.bidderNaam ? `<strong>Contact:</strong> ${escapeHtml(opts.bidderNaam)}<br/>` : ""}
        ${opts.bidderEmail ? `<strong>E-mail:</strong> ${escapeHtml(opts.bidderEmail)}<br/>` : ""}
        ${opts.bidderTelefoon ? `<strong>Tel:</strong> ${escapeHtml(opts.bidderTelefoon)}` : ""}
      </p>
      ${
        opts.adminUrl
          ? `<p><a href="${escapeHtml(opts.adminUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700">Open in CRM</a></p>`
          : ""
      }
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text: lines.join("\n"), html };
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
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Er staat een heftruck voor je klaar op de marketplace van <strong>${escapeHtml(company.name)}</strong>:</p>
      <p style="font-size:16px;font-weight:700">${escapeHtml(opts.listingTitle)}<br/>
      <span style="font-weight:400;color:#514f4d">Locatie: ${escapeHtml(opts.woonplaats)} · open tot ${escapeHtml(ends)}</span></p>
      <p><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700">Bekijk & bied</a></p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

/** Directe deel-link naar handelaar (geen marketplace/veiling). */
export function dealerDirectShareEmail(opts: {
  /** Leeg → "Beste," */
  greetingName: string;
  vehicleLabel: string;
  woonplaats: string;
  omschrijving: string | null;
  url: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const greeting = opts.greetingName.trim()
    ? `Beste ${opts.greetingName.trim()},`
    : "Beste,";
  const subject = `Heftruck aangeboden: ${opts.vehicleLabel}`;
  const text = [
    greeting,
    "",
    `We hebben een heftruck die mogelijk interessant voor je is:`,
    "",
    opts.vehicleLabel,
    opts.woonplaats ? `Locatie: ${opts.woonplaats}` : null,
    opts.omschrijving ? `Omschrijving: ${opts.omschrijving}` : null,
    "",
    `Bekijk foto's en details: ${opts.url}`,
    "",
    emailSignOffText(company),
  ]
    .filter((l): l is string => l != null)
    .join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>${escapeHtml(greeting)}</p>
      <p>We hebben een heftruck die mogelijk interessant voor je is:</p>
      <p style="font-size:16px;font-weight:700">${escapeHtml(opts.vehicleLabel)}
      ${opts.woonplaats ? `<br/><span style="font-weight:400;color:#514f4d">Locatie: ${escapeHtml(opts.woonplaats)}</span>` : ""}
      </p>
      ${
        opts.omschrijving
          ? `<p style="color:#514f4d;white-space:pre-wrap">${escapeHtml(opts.omschrijving)}</p>`
          : ""
      }
      <p><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Bekijk aanbod</a></p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

/** Meerdere heftrucks in één selectie naar handelaar. */
export function dealerSelectionShareEmail(opts: {
  greetingName: string;
  selectionNaam: string;
  vehicleLabels: string[];
  url: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const greeting = opts.greetingName.trim()
    ? `Beste ${opts.greetingName.trim()},`
    : "Beste,";
  const subject = `Heftruck selectie: ${opts.selectionNaam}`;
  const listText = opts.vehicleLabels.map((l) => `• ${l}`).join("\n");
  const listHtml = opts.vehicleLabels
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");

  const text = [
    greeting,
    "",
    "Heftruck selectie speciaal voor u.",
    "",
    opts.selectionNaam,
    "",
    listText,
    "",
    `Bekijk de selectie: ${opts.url}`,
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>${escapeHtml(greeting)}</p>
      <p style="font-size:16px;font-weight:700">Heftruck selectie speciaal voor u</p>
      <p><strong>${escapeHtml(opts.selectionNaam)}</strong></p>
      <ul>${listHtml}</ul>
      <p><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Bekijk selectie</a></p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

/** Dagelijkse digest: nieuwe marketplace-listings van vandaag. */
export function marketplaceDailyDigestEmail(opts: {
  bedrijf: string;
  items: {
    title: string;
    merk: string;
    model: string | null;
    omschrijving: string | null;
    woonplaats: string;
    photoUrl: string | null;
    extraPhotoCount: number;
    url: string;
  }[];
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const greeting = opts.bedrijf.trim()
    ? `Beste ${opts.bedrijf.trim()},`
    : "Beste,";
  const subject = "Aanbod van de dag";
  const count = opts.items.length;

  const textBlocks = opts.items.map((item) => {
    const lines = [
      item.title,
      item.woonplaats ? `Locatie: ${item.woonplaats}` : null,
      item.omschrijving ? item.omschrijving : null,
      item.extraPhotoCount > 0
        ? `+${item.extraPhotoCount} extra foto${item.extraPhotoCount === 1 ? "" : "'s"}`
        : null,
      `Bekijk: ${item.url}`,
    ].filter((l): l is string => l != null);
    return lines.join("\n");
  });

  const text = [
    greeting,
    "",
    "Handel van de dag speciaal voor u klaar gezet:",
    "",
    ...textBlocks.flatMap((block, i) =>
      i === 0 ? [block] : ["", "—", "", block],
    ),
    "",
    emailSignOffText(company),
  ].join("\n");

  const itemsHtml = opts.items
    .map((item) => {
      const btnLabel = `Bekijk ${item.title}`.trim();
      const extra =
        item.extraPhotoCount > 0
          ? `<p style="margin:8px 0 0;color:#706e6b;font-size:13px">+${item.extraPhotoCount} extra foto${item.extraPhotoCount === 1 ? "" : "'s"}</p>`
          : "";
      const desc = item.omschrijving
        ? `<p style="margin:8px 0 0;color:#514f4d;font-size:14px;white-space:pre-wrap">${escapeHtml(item.omschrijving)}</p>`
        : "";
      const photo = item.photoUrl
        ? `<img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.title)}" width="160" height="120" style="display:block;width:160px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #e5e5e5" />`
        : `<div style="width:160px;height:120px;background:#f3f2f1;border-radius:6px;border:1px solid #e5e5e5"></div>`;

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-collapse:collapse">
        <tr>
          <td width="160" valign="top" style="padding:0 16px 0 0">${photo}</td>
          <td valign="top" style="padding:0">
            <p style="margin:0;font-size:17px;font-weight:700;line-height:1.3">${escapeHtml(item.title)}</p>
            ${
              item.woonplaats
                ? `<p style="margin:4px 0 0;color:#706e6b;font-size:13px">${escapeHtml(item.woonplaats)}</p>`
                : ""
            }
            ${desc}
            ${extra}
            <p style="margin:14px 0 0">
              <a href="${escapeHtml(item.url)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(btnLabel)}</a>
            </p>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5;max-width:640px">
      <p style="margin:0 0 8px;font-size:20px;font-weight:700">${escapeHtml(subject)}</p>
      <p>${escapeHtml(greeting)}</p>
      <p>Handel van de dag speciaal voor u klaar gezet${count > 1 ? ` (${count} heftrucks)` : ""}:</p>
      ${itemsHtml}
      ${emailSignOffHtml(company)}
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
    emailSignOffText(company),
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
      ${emailSignOffHtml(company)}
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

export function portalWelcomeEmail(opts: {
  toName: string;
  vehicleLabel: string;
  magicUrl: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Welkom — we gaan voor je aan de slag | ${company.name}`;
  const text = [
    `Beste ${opts.toName},`,
    "",
    `Bedankt voor je aanmelding van je ${opts.vehicleLabel}.`,
    "",
    "We gaan voor je aan de slag. We nemen zo snel mogelijk telefonisch contact met je op (binnen 24 uur).",
    "",
    "In je persoonlijke portaal kun je de status volgen, foto's uploaden en (zodra beschikbaar) de koopovereenkomst downloaden:",
    opts.magicUrl,
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Bedankt voor je aanmelding van je <strong>${escapeHtml(opts.vehicleLabel)}</strong>.</p>
      <p>We gaan voor je aan de slag. We nemen zo snel mogelijk <strong>telefonisch contact</strong> met je op (binnen 24 uur).</p>
      <p>In je persoonlijke portaal kun je de status volgen, foto&apos;s uploaden en (zodra beschikbaar) de koopovereenkomst downloaden:</p>
      <p><a href="${escapeHtml(opts.magicUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open mijn portaal</a></p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

export function portalMagicLinkEmail(opts: {
  toName: string;
  vehicleLabel: string;
  magicUrl: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Volg je aanvraag — ${company.name}`;
  const text = [
    `Beste ${opts.toName},`,
    "",
    `Bedankt voor je aanmelding van je ${opts.vehicleLabel}.`,
    "",
    "Via deze beveiligde link kun je de status van je verkoop volgen en (zodra beschikbaar) de koopovereenkomst downloaden:",
    opts.magicUrl,
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Bedankt voor je aanmelding van je <strong>${escapeHtml(opts.vehicleLabel)}</strong>.</p>
      <p>Via deze beveiligde link kun je de status van je verkoop volgen en (zodra beschikbaar) de koopovereenkomst downloaden:</p>
      <p><a href="${escapeHtml(opts.magicUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open mijn portaal</a></p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

export function portalRequestPhotosEmail(opts: {
  toName: string;
  vehicleLabel: string;
  magicUrl: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Upload foto's van je ${opts.vehicleLabel} — ${company.name}`;
  const text = [
    `Beste ${opts.toName},`,
    "",
    `Om je ${opts.vehicleLabel} sneller en voor een betere prijs te kunnen verkopen, hebben we een paar goede foto's nodig.`,
    "",
    "Upload je foto's eenvoudig via je persoonlijke portaal:",
    opts.magicUrl,
    "",
    "Tips: maak foto's van voren, opzij, het typeplaatje en eventuele schade of bijzonderheden.",
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Om je <strong>${escapeHtml(opts.vehicleLabel)}</strong> sneller en voor een betere prijs te kunnen verkopen, hebben we een paar goede foto&apos;s nodig.</p>
      <p>Upload je foto&apos;s eenvoudig via je persoonlijke portaal:</p>
      <p><a href="${escapeHtml(opts.magicUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Upload je foto&apos;s</a></p>
      <p style="color:#514f4d;font-size:14px">Tips: maak foto&apos;s van voren, opzij, het typeplaatje en eventuele schade of bijzonderheden.</p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

export function portalReplyTo(): string {
  return CANONICAL_REPLY_TO;
}

/** Admin → lead: vrij bericht in merk-layout. */
export function leadMessageEmail(opts: {
  subject: string;
  /** Volledige body inclusief "Beste …," */
  body: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const body = opts.body.trim();
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const text = [body, "", emailSignOffText(company)].join("\n");

  const htmlBody = paragraphs
    .map((p) => {
      const withBreaks = escapeHtml(p).replace(/\n/g, "<br/>");
      return `<p>${withBreaks}</p>`;
    })
    .join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      ${htmlBody}
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject: opts.subject.trim(), text, html };
}

export function adminUserInviteEmail(opts: {
  toName: string;
  email: string;
  password: string;
  loginUrl: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Je CRM-account — ${company.name}`;
  const text = [
    `Beste ${opts.toName},`,
    "",
    `Er is een CRM-account voor je aangemaakt bij ${company.name}.`,
    "",
    `Login e-mail: ${opts.email}`,
    `Wachtwoord: ${opts.password}`,
    "",
    `Log in via: ${opts.loginUrl}`,
    "",
    "Gebruik je login e-mail (@heftruckverkocht.nl) om in te loggen.",
    "Wijzig je wachtwoord direct na inloggen via Instellingen.",
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.toName)},</p>
      <p>Er is een CRM-account voor je aangemaakt bij <strong>${escapeHtml(company.name)}</strong>.</p>
      <p>
        <strong>Login e-mail:</strong> ${escapeHtml(opts.email)}<br/>
        <strong>Wachtwoord:</strong> ${escapeHtml(opts.password)}
      </p>
      <p><a href="${escapeHtml(opts.loginUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Naar CRM login</a></p>
      <p style="color:#514f4d;font-size:14px">Gebruik je login e-mail (<strong>@heftruckverkocht.nl</strong>) om in te loggen. Wijzig je wachtwoord via <strong>Instellingen</strong>.</p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

export function dealerInviteEmail(opts: {
  bedrijf: string;
  email: string;
  loginUrl: string;
  dealCount?: number;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const deals =
    opts.dealCount != null && opts.dealCount > 0
      ? opts.dealCount
      : null;
  const subject = `Welkom bij ${company.name} — bekijk beschikbare heftrucks`;
  const text = [
    `Beste ${opts.bedrijf},`,
    "",
    `Welkom bij de marketplace van ${company.name}.`,
    deals
      ? `Er staan nu ${deals} heftruck${deals === 1 ? "" : "s"} klaar om te bekijken.`
      : "Activeer je account om heftrucks te bekijken en te bieden.",
    "",
    `Je account e-mail: ${opts.email}`,
    "",
    "Klik op de link hieronder om te starten. Je kiest zelf een wachtwoord.",
    "",
    opts.loginUrl,
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.bedrijf)},</p>
      <p>Welkom bij de marketplace van <strong>${escapeHtml(company.name)}</strong>.</p>
      ${
        deals
          ? `<p>Er staan nu <strong>${deals} heftruck${deals === 1 ? "" : "s"}</strong> klaar om te bekijken.</p>`
          : `<p>Activeer je account om heftrucks te bekijken en te bieden.</p>`
      }
      <p><strong>Je account e-mail:</strong> ${escapeHtml(opts.email)}</p>
      <p>Klik op de knop hieronder om te starten. Je kiest zelf een wachtwoord.</p>
      <p><a href="${escapeHtml(opts.loginUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Account activeren</a></p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

export function dealerActivatedEmail(opts: {
  bedrijf: string;
  email: string;
  password: string;
  loginUrl: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Gefeliciteerd — je account is geactiveerd | ${company.name}`;
  const text = [
    `Beste ${opts.bedrijf},`,
    "",
    "Gefeliciteerd! Je account is geactiveerd.",
    "",
    "Inloggegevens",
    `E-mail: ${opts.email}`,
    `Wachtwoord: ${opts.password}`,
    "",
    "Om in te loggen:",
    opts.loginUrl,
    "",
    "Bewaar deze gegevens goed. Je kunt je wachtwoord later wijzigen via ‘Wachtwoord vergeten’ op de inlogpagina.",
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.bedrijf)},</p>
      <p><strong>Gefeliciteerd!</strong> Je account is geactiveerd.</p>
      <p style="margin:1.1rem 0 0.35rem;font-weight:800">Inloggegevens</p>
      <p style="margin:0">
        <strong>E-mail:</strong> ${escapeHtml(opts.email)}<br/>
        <strong>Wachtwoord:</strong> ${escapeHtml(opts.password)}
      </p>
      <p style="margin:1.1rem 0 0.75rem">Om in te loggen:</p>
      <p><a href="${escapeHtml(opts.loginUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Naar marketplace login</a></p>
      <p style="color:#514f4d;font-size:14px">Bewaar deze gegevens goed. Je kunt je wachtwoord later wijzigen via <strong>Wachtwoord vergeten</strong> op de inlogpagina.</p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}

export function dealerResetPasswordEmail(opts: {
  bedrijf: string;
  email: string;
  resetUrl: string;
}): { subject: string; text: string; html: string } {
  const company = getCompanyInfo();
  const subject = `Wachtwoord opnieuw instellen | ${company.name}`;
  const text = [
    `Beste ${opts.bedrijf},`,
    "",
    "Je hebt gevraagd om je marketplace-wachtwoord opnieuw in te stellen.",
    "",
    `Account: ${opts.email}`,
    "",
    "Klik op de link hieronder (geldig voor 2 uur):",
    opts.resetUrl,
    "",
    "Heb jij dit niet aangevraagd? Negeer deze mail dan.",
    "",
    emailSignOffText(company),
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#181818;line-height:1.5">
      <p>Beste ${escapeHtml(opts.bedrijf)},</p>
      <p>Je hebt gevraagd om je marketplace-wachtwoord opnieuw in te stellen.</p>
      <p><strong>Account:</strong> ${escapeHtml(opts.email)}</p>
      <p>Klik op de knop hieronder (geldig voor 2 uur):</p>
      <p><a href="${escapeHtml(opts.resetUrl)}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Nieuw wachtwoord kiezen</a></p>
      <p style="color:#514f4d;font-size:14px">Heb jij dit niet aangevraagd? Negeer deze mail dan.</p>
      ${emailSignOffHtml(company)}
    </div>
  `;

  return { subject, text, html };
}
