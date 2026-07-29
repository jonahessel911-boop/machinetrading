import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
} from "pdf-lib";
import type { CompanyInfo } from "./company";
import { companyAddressLine } from "./company";
import type { Invoice } from "./invoices";
import type { InvoiceSettings } from "./invoices";
import { formatEuro } from "./status";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 48;
const orange = rgb(1, 0.4, 0);
const dark = rgb(0.12, 0.12, 0.12);
const muted = rgb(0.35, 0.35, 0.35);
const line = rgb(0.82, 0.82, 0.82);

export function invoicePdfFilename(
  invoice: Pick<Invoice, "invoiceNumber" | "status">,
): string {
  const num = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "");
  if (invoice.status === "concept") {
    return `factuur-draft-${num}.pdf`;
  }
  return `factuur-${num}.pdf`;
}

function formatDatum(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function buildInvoicePdf(
  invoice: Invoice,
  buyer: {
    naam: string;
    bedrijf: string;
    email: string | null;
    telefoon: string | null;
  },
  settings: InvoiceSettings | null,
  company: CompanyInfo,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  let logo: PDFImage | null = null;
  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public/images/logo-clean.png"),
    );
    logo = await doc.embedPng(logoBytes);
  } catch {
    logo = null;
  }

  let y = PAGE_H - 48;

  if (logo) {
    const lw = 120;
    const lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: y - lh,
      width: lw,
      height: lh,
    });
  }

  const title =
    invoice.status === "concept" ? "Factuur (draft)" : "Factuur";
  page.drawText(title, {
    x: PAGE_W - MARGIN_X - bold.widthOfTextAtSize(title, 18),
    y: y - 8,
    size: 18,
    font: bold,
    color: dark,
  });
  y -= 36;

  page.drawText(invoice.invoiceNumber, {
    x: PAGE_W - MARGIN_X - bold.widthOfTextAtSize(invoice.invoiceNumber, 11),
    y,
    size: 11,
    font: bold,
    color: orange,
  });
  y -= 28;

  page.drawText("Van", {
    x: MARGIN_X,
    y,
    size: 9,
    font: bold,
    color: muted,
  });
  page.drawText("Aan", {
    x: PAGE_W / 2,
    y,
    size: 9,
    font: bold,
    color: muted,
  });
  y -= 14;

  const leftLines = [
    company.legalName,
    companyAddressLine(company),
    `KvK ${company.kvk}`,
    `BTW ${company.btw}`,
    company.email,
    company.phone,
  ];
  const rightName =
    settings?.invoiceBedrijf?.trim() || buyer.bedrijf || "—";
  const rightContact =
    settings?.invoiceContact?.trim() || buyer.naam || "";
  const rightStreet = [
    settings?.invoiceStraat,
    settings?.invoiceHuisnummer,
  ]
    .filter(Boolean)
    .join(" ");
  const rightCity = [
    settings?.invoicePostcode,
    settings?.invoiceWoonplaats,
  ]
    .filter(Boolean)
    .join(" ");
  const rightLines = [
    rightName,
    rightContact,
    rightStreet,
    rightCity,
    settings?.invoiceEmail || buyer.email || "",
    settings?.invoiceKvk ? `KvK ${settings.invoiceKvk}` : "",
    settings?.invoiceBtw ? `BTW ${settings.invoiceBtw}` : "",
  ].filter(Boolean);

  const leftStart = y;
  for (const t of leftLines) {
    page.drawText(t, { x: MARGIN_X, y, size: 9, font, color: dark });
    y -= 12;
  }
  let ry = leftStart;
  for (const t of rightLines) {
    page.drawText(t, { x: PAGE_W / 2, y: ry, size: 9, font, color: dark });
    ry -= 12;
  }
  y = Math.min(y, ry) - 16;

  page.drawText(`Factuurdatum: ${formatDatum(invoice.issueDate)}`, {
    x: MARGIN_X,
    y,
    size: 9,
    font,
    color: muted,
  });
  if (invoice.dueDate) {
    page.drawText(`Vervaldatum: ${formatDatum(invoice.dueDate)}`, {
      x: PAGE_W / 2,
      y,
      size: 9,
      font,
      color: muted,
    });
  }
  y -= 24;

  // Table header
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 6,
    width: PAGE_W - MARGIN_X * 2,
    height: 22,
    color: rgb(0.96, 0.96, 0.96),
  });
  page.drawText("Omschrijving", {
    x: MARGIN_X + 8,
    y: y,
    size: 9,
    font: bold,
    color: muted,
  });
  page.drawText("Bedrag", {
    x: PAGE_W - MARGIN_X - 80,
    y: y,
    size: 9,
    font: bold,
    color: muted,
  });
  y -= 28;

  const desc = invoice.description?.trim() || "Bemiddelingsfee";
  page.drawText(desc.slice(0, 70), {
    x: MARGIN_X + 8,
    y,
    size: 10,
    font,
    color: dark,
  });
  const bedrag = formatEuro(invoice.amountExBtw);
  page.drawText(bedrag, {
    x: PAGE_W - MARGIN_X - font.widthOfTextAtSize(bedrag, 10) - 8,
    y,
    size: 10,
    font: bold,
    color: dark,
  });
  y -= 18;

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 1,
    color: line,
  });
  y -= 22;

  const totals: Array<[string, string, boolean]> = [
    ["Bedrag (marge / omzet)", formatEuro(invoice.amountExBtw), true],
    [`BTW ${invoice.btwPct}%`, formatEuro(invoice.btwAmount), false],
    ["Totaal incl. BTW", formatEuro(invoice.amountIncBtw), false],
  ];

  for (const [label, value, emphasize] of totals) {
    page.drawText(label, {
      x: PAGE_W - MARGIN_X - 220,
      y,
      size: emphasize ? 10 : 9,
      font: emphasize ? bold : font,
      color: emphasize ? dark : muted,
    });
    page.drawText(value, {
      x: PAGE_W - MARGIN_X - font.widthOfTextAtSize(value, emphasize ? 10 : 9) - 8,
      y,
      size: emphasize ? 10 : 9,
      font: emphasize ? bold : font,
      color: dark,
    });
    y -= emphasize ? 16 : 14;
  }

  y -= 24;
  page.drawText(
    "Factuurbedrag = bemiddelingsmarge (omzet) van de deal, exclusief BTW.",
    {
      x: MARGIN_X,
      y,
      size: 8,
      font,
      color: muted,
    },
  );

  return doc.save();
}
