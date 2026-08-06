export type CompanyInfo = {
  name: string;
  legalName: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  kvk: string;
  /** Leeg = geen BTW-nummer (niet tonen op contract/factuur-header) */
  btw: string;
  email: string;
  phone: string;
  website: string;
};

/**
 * Vaste bedrijfsgegevens bemiddelaar — niet overschrijfbaar via env
 * met verkeerde placeholder-waarden.
 */
const CANONICAL = {
  name: "Heftruckverkocht.nl",
  legalName: "Heftruckverkocht.nl",
  street: "Computerweg",
  houseNumber: "7",
  postcode: "3542DP",
  city: "Utrecht",
  kvk: "82962081",
  btw: "",
  email: "info@heftruckverkocht.nl",
  phone: "085 800 1645",
  website: "https://www.heftruckverkocht.nl",
} as const;

export function getCompanyInfo(): CompanyInfo {
  return {
    name: CANONICAL.name,
    legalName: CANONICAL.legalName,
    street: CANONICAL.street,
    houseNumber: CANONICAL.houseNumber,
    postcode: CANONICAL.postcode,
    city: CANONICAL.city,
    kvk: CANONICAL.kvk,
    btw: CANONICAL.btw,
    email: CANONICAL.email,
    phone: CANONICAL.phone,
    website:
      process.env.COMPANY_WEBSITE?.trim() || CANONICAL.website,
  };
}

export function companyAddressLine(c: CompanyInfo = getCompanyInfo()): string {
  return `${c.street} ${c.houseNumber}, ${c.postcode} ${c.city}`;
}

/** Adresregel zoals in e-mailafsluiting */
export function companyAddressDash(c: CompanyInfo = getCompanyInfo()): string {
  return `${c.street} ${c.houseNumber} - ${c.postcode} - ${c.city}`;
}

/**
 * Vaste mailafsluiting:
 * Met vriendelijke groet,
 * Jona
 * Heftruckverkocht.nl
 * email | telefoon
 *
 * Computerweg 7 - 3542DP - Utrecht
 */
export function emailSignOffText(c: CompanyInfo = getCompanyInfo()): string {
  return [
    "Met vriendelijke groet,",
    "Jona",
    c.name,
    `${c.email} | ${c.phone}`,
    "",
    companyAddressDash(c),
  ].join("\n");
}

export function emailSignOffHtml(c: CompanyInfo = getCompanyInfo()): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `<p>Met vriendelijke groet,<br/>
Jona<br/>
${esc(c.name)}<br/>
${esc(c.email)} | ${esc(c.phone)}</p>
<p style="color:#706e6b;font-size:13px">${esc(companyAddressDash(c))}</p>`;
}
