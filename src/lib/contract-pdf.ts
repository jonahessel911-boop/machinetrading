import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFImage,
} from "pdf-lib";
import type { CompanyInfo } from "./company";
import { formatEuro, vehicleLabel } from "./status";

export type ContractLead = {
  id?: string;
  naam: string;
  email: string;
  telefoon: string;
  straat?: string | null;
  huisnummer?: string | null;
  toevoeging?: string | null;
  postcode?: string | null;
  woonplaats: string;
  merk: string;
  model: string | null;
  timing: string;
  /** Bruto = enige prijs in contract (klant ontvangt dit) */
  inkoopprijs: number | null;
  dealDatum?: string | null;
};

export type ContractBuyer = {
  naam: string;
  email: string | null;
  telefoon: string | null;
  bedrijf: string;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 48;
const MARGIN_BOTTOM = 52;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const orange = rgb(1, 0.4, 0);
const dark = rgb(0.12, 0.12, 0.12);
const muted = rgb(0.35, 0.35, 0.35);
const line = rgb(0.82, 0.82, 0.82);
const soft = rgb(0.96, 0.96, 0.96);

function addressLine(lead: ContractLead): string {
  const street = [lead.straat, lead.huisnummer, lead.toevoeging]
    .filter(Boolean)
    .join(" ");
  const city = [lead.postcode, lead.woonplaats].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ");
}

function formatDatumLong(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDatumShort(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function refCode(lead: ContractLead): string {
  const base = (lead.model || lead.merk || "HEF")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  const id = (lead.id || "X").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `HV-${base || "HEF"}-${id || "000"}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\t/g, " ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  logo: PDFImage | null;
  company: CompanyInfo;
  ref: string;
  titleSuffix: string;
  y: number;
};

function addPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - 56;
  drawFooter(ctx);
}

function ensureSpace(ctx: Ctx, need: number) {
  if (ctx.y - need < MARGIN_BOTTOM + 24) {
    addPage(ctx);
  }
}

function drawFooter(ctx: Ctx) {
  const pages = ctx.doc.getPageCount();
  const label = `${formatDatumShort()}  ·  Koopovereenkomst ${ctx.titleSuffix}`;
  ctx.page.drawText(label, {
    x: MARGIN_X,
    y: 28,
    size: 8,
    font: ctx.font,
    color: muted,
  });
  ctx.page.drawText(`${pages}`, {
    x: PAGE_W - MARGIN_X - 20,
    y: 28,
    size: 8,
    font: ctx.font,
    color: muted,
  });
}

function drawHeader(ctx: Ctx) {
  // Brand bar
  ctx.page.drawRectangle({
    x: 0,
    y: PAGE_H - 78,
    width: PAGE_W,
    height: 78,
    color: rgb(0.07, 0.07, 0.07),
  });

  if (ctx.logo) {
    const maxH = 48;
    const maxW = 220;
    const scale = Math.min(maxW / ctx.logo.width, maxH / ctx.logo.height);
    const w = ctx.logo.width * scale;
    const h = ctx.logo.height * scale;
    ctx.page.drawImage(ctx.logo, {
      x: MARGIN_X,
      y: PAGE_H - 64,
      width: w,
      height: h,
    });
  } else {
    ctx.page.drawText(ctx.company.name, {
      x: MARGIN_X,
      y: PAGE_H - 48,
      size: 16,
      font: ctx.bold,
      color: orange,
    });
  }

  ctx.page.drawText("HEFTRUCK BEMIDDELING", {
    x: PAGE_W - MARGIN_X - 150,
    y: PAGE_H - 42,
    size: 9,
    font: ctx.bold,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText(ctx.company.website.replace(/^https?:\/\//, ""), {
    x: PAGE_W - MARGIN_X - 150,
    y: PAGE_H - 56,
    size: 8,
    font: ctx.font,
    color: rgb(0.75, 0.75, 0.75),
  });

  ctx.y = PAGE_H - 100;
}

function drawText(
  ctx: Ctx,
  text: string,
  opts: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    x?: number;
    maxWidth?: number;
    gap?: number;
  } = {},
) {
  const size = opts.size ?? 10;
  const f = opts.bold ? ctx.bold : ctx.font;
  const color = opts.color ?? dark;
  const x = opts.x ?? MARGIN_X;
  const maxWidth = opts.maxWidth ?? CONTENT_W;
  const gap = opts.gap ?? 4;
  const lines = wrapText(text, f, size, maxWidth);
  for (const ln of lines) {
    ensureSpace(ctx, size + gap + 2);
    ctx.page.drawText(ln, { x, y: ctx.y, size, font: f, color });
    ctx.y -= size + gap;
  }
}

function drawSectionTitle(ctx: Ctx, title: string) {
  ensureSpace(ctx, 28);
  ctx.y -= 6;
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: ctx.y - 4,
    width: 3,
    height: 14,
    color: orange,
  });
  ctx.page.drawText(title, {
    x: MARGIN_X + 10,
    y: ctx.y,
    size: 12,
    font: ctx.bold,
    color: dark,
  });
  ctx.y -= 20;
}

function drawPartyBox(
  ctx: Ctx,
  x: number,
  width: number,
  title: string,
  lines: string[],
  topY: number,
): number {
  const pad = 10;
  const titleH = 16;
  const lineH = 12;
  const contentLines = lines.filter(Boolean);
  const boxH = pad * 2 + titleH + contentLines.length * lineH + 6;

  ctx.page.drawRectangle({
    x,
    y: topY - boxH,
    width,
    height: boxH,
    color: soft,
    borderColor: line,
    borderWidth: 1,
  });
  ctx.page.drawText(title, {
    x: x + pad,
    y: topY - pad - 10,
    size: 9,
    font: ctx.bold,
    color: orange,
  });

  let ly = topY - pad - titleH - 8;
  for (const raw of contentLines) {
    const wrapped = wrapText(raw, ctx.font, 9, width - pad * 2);
    for (const w of wrapped) {
      ctx.page.drawText(w, {
        x: x + pad,
        y: ly,
        size: 9,
        font: ctx.font,
        color: dark,
      });
      ly -= lineH;
    }
  }
  return boxH;
}

function drawSpecRow(ctx: Ctx, label: string, value: string) {
  ensureSpace(ctx, 18);
  const rowY = ctx.y;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: rowY + 12 },
    end: { x: MARGIN_X + CONTENT_W, y: rowY + 12 },
    thickness: 0.5,
    color: line,
  });
  ctx.page.drawText(label, {
    x: MARGIN_X,
    y: rowY,
    size: 9,
    font: ctx.font,
    color: muted,
  });
  const valLines = wrapText(value || "—", ctx.bold, 9, CONTENT_W * 0.55);
  let vy = rowY;
  for (const ln of valLines) {
    ctx.page.drawText(ln, {
      x: MARGIN_X + CONTENT_W * 0.38,
      y: vy,
      size: 9,
      font: ctx.bold,
      color: dark,
    });
    vy -= 12;
  }
  ctx.y = Math.min(rowY, vy) - 6;
}

export async function buildContractPdf(
  lead: ContractLead,
  buyer: ContractBuyer,
  company: CompanyInfo,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public/images/logo-clean.png");
    const bytes = await readFile(logoPath);
    logo = await doc.embedPng(bytes);
  } catch {
    try {
      const fallback = path.join(process.cwd(), "public/images/logo.png");
      const bytes = await readFile(fallback);
      logo = await doc.embedPng(bytes);
    } catch {
      logo = null;
    }
  }

  const ref = refCode(lead);
  const titleSuffix = vehicleLabel(lead.merk, lead.model);
  const prijs = formatEuro(lead.inkoopprijs);
  const brandShort = company.name;

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    font,
    bold,
    logo,
    company,
    ref,
    titleSuffix,
    y: PAGE_H - 100,
  };

  drawHeader(ctx);
  drawFooter(ctx);

  // Title block
  drawText(ctx, `Datum: ${formatDatumLong(lead.dealDatum)}`, {
    size: 10,
    color: muted,
  });
  ctx.y -= 2;
  drawText(ctx, "Koopovereenkomst", { size: 22, bold: true });
  drawText(ctx, `Ref: ${ref}`, { size: 10, color: muted });
  ctx.y -= 8;

  // Party boxes
  ensureSpace(ctx, 130);
  const boxTop = ctx.y;
  const gap = 10;
  const boxW = (CONTENT_W - gap * 2) / 3;
  const verkoperLines = [
    lead.naam,
    lead.telefoon,
    lead.email,
    addressLine(lead),
  ];
  const koperLines = [
    buyer.bedrijf,
    buyer.naam,
    buyer.email || "",
    buyer.telefoon || "",
  ];
  const bemiddelaarLines = [
    company.legalName || company.name,
    company.phone,
    company.email,
    `${company.street} ${company.houseNumber}`,
    `${company.postcode} ${company.city}`,
    `KvK: ${company.kvk}`,
  ];
  const h1 = drawPartyBox(ctx, MARGIN_X, boxW, "VERKOPER", verkoperLines, boxTop);
  const h2 = drawPartyBox(
    ctx,
    MARGIN_X + boxW + gap,
    boxW,
    "KOPER",
    koperLines,
    boxTop,
  );
  const h3 = drawPartyBox(
    ctx,
    MARGIN_X + (boxW + gap) * 2,
    boxW,
    "BEMIDDELAAR",
    bemiddelaarLines,
    boxTop,
  );
  ctx.y = boxTop - Math.max(h1, h2, h3) - 14;

  drawText(
    ctx,
    "Verkoper en koper verklaren deze koopovereenkomst mondeling te zijn aangegaan volgens de volgende bepalingen en voorwaarden.",
    { size: 9, color: muted },
  );
  ctx.y -= 6;

  drawSectionTitle(ctx, "Betreft de volgende heftruck");
  drawText(ctx, "Algemeen", { size: 10, bold: true });
  drawSpecRow(ctx, "Merk", lead.merk);
  drawSpecRow(ctx, "Model / uitvoering", lead.model || "—");
  drawSpecRow(ctx, "Locatie", lead.woonplaats || "—");
  drawSpecRow(ctx, "Adres", addressLine(lead) || "—");
  drawSpecRow(ctx, "Beschikbaarheid / timing", lead.timing || "—");
  drawSpecRow(ctx, "Overeengekomen prijs (bruto)", prijs);
  ctx.y -= 8;

  drawSectionTitle(ctx, "Voorwaarden");

  const voorwaarden = [
    `Indien het een zakelijke heftruck betreft waar de B.T.W. van teruggevorderd kan worden dan is het bedrag inclusief B.T.W.`,
    `De verkoper garandeert de juistheid van de opgegeven informatie en verleent op verzoek van de koper medewerking aan de juiste inzage in de onderhoudshistorie en documentatie van de heftruck.`,
    `De verkoper ontvangt na controle direct het overeengekomen bedrag. Dit kan contant dan wel per bankoverschrijving. Als de betaling per bank wordt voldaan, dient de koper de verkoper een bewijs van betaling te laten zien.`,
    `De heftruck dient binnen 14 dagen afgeleverd te worden bij de koper. U dient binnen 3 dagen na het verzenden van de overeenkomst een afspraak in te plannen met de koper. Als een der partijen het niet lukt om een ander te bereiken voor het maken van een afleverafspraak, dient u dit binnen deze 3 dagen kenbaar te maken aan ${brandShort}.`,
    `De koper heeft het recht om een controle uit te voeren alvorens er over wordt gegaan tot betaling. Eventuele bijkomende gebreken dienen kenbaar gemaakt te worden aan ${brandShort}.`,
    `Het is de koper niet toegestaan om tijdens de aflevering, zonder rechtvaardige onderbouwing, opnieuw te onderhandelen over de prijs. Als dit wel het geval is, dient de verkoper direct contact op te nemen met ${brandShort} tel ${company.phone}.`,
    `Mocht er wel onderhandeld worden over de verkoopprijs zonder inlichting naar ${brandShort} staat hier een boete op van €5.000,- per overtreding.`,
    `Het ondertekenen van deze overeenkomst is niet noodzakelijk. Na het tekenen van deze overeenkomst is het wel noodzakelijk de overeenkomst retour te sturen. Alle gevoerde gesprekken met zowel de verkoper als koper worden ten behoeve van de kwaliteit van onze service en eventuele verkopen opgenomen en daarmee mondeling bevestigd. Deze overeenkomst is voor zowel de verkoper als koper bindend.`,
  ];

  for (const t of voorwaarden) {
    ensureSpace(ctx, 40);
    drawText(ctx, t, { size: 9, gap: 3 });
    ctx.y -= 6;
  }

  drawText(ctx, "Met alle betrokken partijen zijn de volgende punten samengevat overeengekomen:", {
    size: 10,
    bold: true,
  });
  ctx.y -= 2;
  const bullets = [
    "Afleveren binnen 14 dagen",
    `Verkoopbedrag: ${prijs}`,
    "De opgegeven informatie is naar waarheid ingevuld",
    "De heftruck is definitief verkocht",
    "De koper verplicht zich tot het inkopen van de betreffende heftruck",
  ];
  for (const b of bullets) {
    ensureSpace(ctx, 16);
    ctx.page.drawText("•", {
      x: MARGIN_X,
      y: ctx.y,
      size: 10,
      font: ctx.bold,
      color: orange,
    });
    drawText(ctx, b, { size: 9, x: MARGIN_X + 14, maxWidth: CONTENT_W - 14 });
  }
  ctx.y -= 6;

  drawText(ctx, "Let u alstublieft op het volgende:", { size: 10, bold: true });
  ctx.y -= 2;
  const aandacht = [
    "Degene die de heftruck inlevert / overdraagt dient zichzelf te kunnen legitimeren.",
    "Deze overeenkomst is bindend. De heftruck is officieel verkocht en mag niet meer aan derden verkocht worden.",
    "Zorg er bij aflevering voor dat alle sleutels, documentatie, toebehoren en eventuele batterij-/laadapparatuur aanwezig zijn.",
    "Zorg er bij aflevering voor dat de onderhoudshistorie en keuringsdocumenten aanwezig zijn (indien van toepassing).",
    `Bij onduidelijkheden voor, tijdens of na de aflevering dient u direct contact op te nemen met ${brandShort}.`,
    `Na het inplannen van een afleverafspraak dient u de datum terug te koppelen aan ${brandShort}. Dit kan per e-mail of per telefoon.`,
    "U hoeft zich geen zorgen te maken over de betaling. Deze wordt altijd ter plaatse voldaan.",
    `Bij misverstanden van welke aard ook behoudt ${brandShort} zich het recht voor om een gegarandeerd bod in te trekken voor dan wel na acceptatie, zonder dat de verkoper of koper hieraan rechten kunnen ontlenen.`,
    `Het verkoopcontract kan door ${brandShort} en/of koper worden ontbonden als de heftruck afwijkt van de opgegeven specificaties, een onlogische urenstand heeft, of ernstige (verzwegen) technische gebreken vertoont.`,
    `Het verkoopcontract kan door ${brandShort} en/of koper worden ontbonden als achteraf blijkt dat de heftruck zwaar beschadigd is geweest (technisch of economisch total loss), of als relevante gebreken of beperkingen niet zijn gemeld en de koper hier niet mee akkoord gaat.`,
    `Als de verkoper zich niet houdt aan de gestelde levertermijn of bij verkoop aan derden, zal de verkoper door ${brandShort} en/of koper in gebreke worden gesteld. Er zal ter keuze van ${brandShort} een vordering tot nakoming dan wel een ontbinding van het verkoopcontract in gang worden gezet en de verkoper is een boete van 15% van het gegarandeerd bod met een minimum van €250,- excl. BTW aan ${brandShort} verschuldigd.`,
  ];

  for (const t of aandacht) {
    ensureSpace(ctx, 36);
    drawText(ctx, t, { size: 9, gap: 3 });
    ctx.y -= 5;
  }

  ctx.y -= 4;
  drawText(
    ctx,
    `Graag willen wij u bedanken voor het gebruik maken van onze verkoopservice. Mocht u in de toekomst weer gebruik willen maken van onze service dan staan wij graag weer voor u klaar.`,
    { size: 9, color: muted },
  );

  // Signatures
  ensureSpace(ctx, 110);
  ctx.y -= 10;
  drawSectionTitle(ctx, "Ondertekening");
  const sigW = (CONTENT_W - 20) / 2;
  const sigTop = ctx.y;
  ctx.page.drawText("Handtekening verkoper", {
    x: MARGIN_X,
    y: sigTop,
    size: 9,
    font: ctx.bold,
    color: dark,
  });
  ctx.page.drawText(lead.naam, {
    x: MARGIN_X,
    y: sigTop - 14,
    size: 9,
    font: ctx.font,
    color: muted,
  });
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: sigTop - 55 },
    end: { x: MARGIN_X + sigW - 10, y: sigTop - 55 },
    thickness: 1,
    color: line,
  });

  ctx.page.drawText("Handtekening koper", {
    x: MARGIN_X + sigW + 20,
    y: sigTop,
    size: 9,
    font: ctx.bold,
    color: dark,
  });
  ctx.page.drawText(buyer.bedrijf, {
    x: MARGIN_X + sigW + 20,
    y: sigTop - 14,
    size: 9,
    font: ctx.font,
    color: muted,
  });
  ctx.page.drawLine({
    start: { x: MARGIN_X + sigW + 20, y: sigTop - 55 },
    end: { x: MARGIN_X + CONTENT_W, y: sigTop - 55 },
    thickness: 1,
    color: line,
  });

  ctx.y = sigTop - 80;
  drawText(ctx, `Bemiddelaar: ${company.name} · ${company.phone} · ${company.email}`, {
    size: 8,
    color: muted,
  });

  // Refresh footers with final page numbers
  const total = doc.getPageCount();
  for (let i = 0; i < total; i++) {
    const p = doc.getPage(i);
    p.drawRectangle({
      x: PAGE_W - MARGIN_X - 40,
      y: 22,
      width: 40,
      height: 14,
      color: rgb(1, 1, 1),
    });
    p.drawText(`${i + 1}/${total}`, {
      x: PAGE_W - MARGIN_X - 28,
      y: 28,
      size: 8,
      font,
      color: muted,
    });
  }

  return doc.save();
}
