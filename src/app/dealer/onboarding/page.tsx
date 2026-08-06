import { DealerOnboardingClient } from "@/components/marketplace/DealerOnboardingClient";
import { getCompanyInfo } from "@/lib/company";
import { sanitizeListingsForGuest } from "@/lib/marketplace";
import { mpListPublic } from "@/lib/marketplace-data";

export default async function DealerOnboardingPage() {
  const company = getCompanyInfo();
  const raw = await mpListPublic().catch(() => []);
  const listings = sanitizeListingsForGuest(raw);

  return (
    <DealerOnboardingClient
      listings={listings}
      phone={company.phone}
      phoneTel={company.phone.replace(/\s/g, "")}
    />
  );
}
