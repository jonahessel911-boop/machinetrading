import {
  crmCreateBuyer,
  crmListBuyersSimple,
  crmUpdateBuyer,
} from "@/lib/crm";
import type { Buyer } from "@/lib/mappers";

/** Consumenten-/webmail-domeinen — geen bedrijfs-match op domein. */
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.nl",
  "outlook.com",
  "outlook.nl",
  "live.com",
  "live.nl",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "yahoo.nl",
  "ymail.com",
  "protonmail.com",
  "proton.me",
  "ziggo.nl",
  "kpnmail.nl",
  "hetnet.nl",
  "home.nl",
  "planet.nl",
  "xs4all.nl",
  "upcmail.nl",
  "chello.nl",
  "caiway.nl",
  "online.nl",
  "tele2.nl",
  "telfort.nl",
  "aolk.nl",
  "aol.com",
]);

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.includes(".") ? domain : null;
}

function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/** Normaliseer bedrijfsnaam / domeinlabel voor fuzzy match. */
export function normalizeCompanyKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(
      /\b(b\.?\s*v\.?|n\.?\s*v\.?|v\.?\s*o\.?\s*f\.?|holding|groep|group|ltd|llc|inc|co)\b/gi,
      "",
    )
    .replace(/[^a-z0-9]+/g, "");
}

/** apeldoornloods.com → Apeldoornloods */
export function companyNameFromDomain(domain: string): string {
  const label = domain.split(".")[0] || domain;
  if (!label) return domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buyerEmails(b: Buyer): string[] {
  const out: string[] = [];
  if (b.email) out.push(b.email.trim().toLowerCase());
  if (b.dealerUsername) out.push(b.dealerUsername.trim().toLowerCase());
  return out;
}

export type EnsureBuyerResult = {
  buyer: Buyer;
  created: boolean;
  matchedBy: "id" | "email" | "domain" | "company" | "created";
};

/**
 * Zorgt dat er een koper bestaat voor een selectie-ontvanger.
 * Geen marketplace-account, geen uitnodigingsmail.
 */
export async function ensureBuyerForSelectionRecipient(input: {
  email: string;
  greetingName?: string | null;
  buyerId?: string | null;
}): Promise<EnsureBuyerResult> {
  const email = input.email.trim().toLowerCase();
  const greeting = (input.greetingName ?? "").trim();
  const buyers = await crmListBuyersSimple();

  if (input.buyerId) {
    const byId = buyers.find((b) => b.id === input.buyerId);
    if (byId) {
      if (!byId.email && email.includes("@")) {
        const updated = await crmUpdateBuyer(byId.id, { email });
        return {
          buyer: updated ?? { ...byId, email },
          created: false,
          matchedBy: "id",
        };
      }
      return { buyer: byId, created: false, matchedBy: "id" };
    }
  }

  const byEmail = buyers.find((b) => buyerEmails(b).includes(email));
  if (byEmail) {
    return { buyer: byEmail, created: false, matchedBy: "email" };
  }

  const domain = emailDomain(email);
  if (domain && !isPublicEmailDomain(domain)) {
    const byDomain = buyers.find((b) =>
      buyerEmails(b).some((e) => emailDomain(e) === domain),
    );
    if (byDomain) {
      if (!byDomain.email) {
        const updated = await crmUpdateBuyer(byDomain.id, { email });
        return {
          buyer: updated ?? { ...byDomain, email },
          created: false,
          matchedBy: "domain",
        };
      }
      return { buyer: byDomain, created: false, matchedBy: "domain" };
    }

    const domainKey = normalizeCompanyKey(domain.split(".")[0] || domain);
    if (domainKey.length >= 4) {
      const byCompany = buyers.find((b) => {
        const key = normalizeCompanyKey(b.bedrijf);
        if (!key) return false;
        return (
          key === domainKey ||
          key.includes(domainKey) ||
          domainKey.includes(key)
        );
      });
      if (byCompany) {
        if (!byCompany.email) {
          const updated = await crmUpdateBuyer(byCompany.id, { email });
          return {
            buyer: updated ?? { ...byCompany, email },
            created: false,
            matchedBy: "company",
          };
        }
        return { buyer: byCompany, created: false, matchedBy: "company" };
      }
    }
  }

  const localPart = email.split("@")[0] || "Contact";
  const bedrijf =
    greeting ||
    (domain && !isPublicEmailDomain(domain)
      ? companyNameFromDomain(domain)
      : localPart);
  const naam = greeting || localPart;

  const created = await crmCreateBuyer({
    naam,
    bedrijf,
    email,
    telefoon: null,
    dealerUsername: null,
    dealerPassword: null,
    dealerEnabled: false,
  });

  return { buyer: created, created: true, matchedBy: "created" };
}
