export type CompanyInfo = {
  name: string;
  legalName: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  kvk: string;
  btw: string;
  email: string;
  phone: string;
  website: string;
};

export function getCompanyInfo(): CompanyInfo {
  return {
    name: process.env.COMPANY_NAME ?? "heftruckverkocht.nl",
    legalName:
      process.env.COMPANY_LEGAL_NAME ?? "heftruckverkocht.nl Bemiddeling",
    street: process.env.COMPANY_STREET ?? "Voorbeeldstraat",
    houseNumber: process.env.COMPANY_HOUSE_NUMBER ?? "1",
    postcode: process.env.COMPANY_POSTCODE ?? "1234AB",
    city: process.env.COMPANY_CITY ?? "Amsterdam",
    kvk: process.env.COMPANY_KVK ?? "00000000",
    btw: process.env.COMPANY_BTW ?? "NL000000000B01",
    email: process.env.COMPANY_EMAIL ?? "info@heftruckverkocht.nl",
    phone: process.env.COMPANY_PHONE ?? "020-0000000",
    website: process.env.COMPANY_WEBSITE ?? "https://heftruckverkocht.nl",
  };
}

export function companyAddressLine(c: CompanyInfo = getCompanyInfo()): string {
  return `${c.street} ${c.houseNumber}, ${c.postcode} ${c.city}`;
}
