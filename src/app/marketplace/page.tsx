import { MarketplaceBrowse } from "@/components/marketplace/MarketplaceBrowse";
import { MarketplaceChrome } from "@/components/marketplace/MarketplaceChrome";
import { isDemoMode } from "@/lib/crm";
import { getDealerSession } from "@/lib/dealer-auth";
import { sanitizeListingsForGuest } from "@/lib/marketplace";
import { mpListPublic } from "@/lib/marketplace-data";

export default async function MarketplacePage() {
  const dealer = await getDealerSession();
  const raw = await mpListPublic();
  const listings = dealer ? raw : sanitizeListingsForGuest(raw);

  return (
    <MarketplaceChrome dealer={dealer} demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Heftruck marketplace</h1>
          <p className="crm-subtitle">
            Actieve veilingen · standaard 7 dagen open voor biedingen
          </p>
        </div>
      </div>

      <MarketplaceBrowse listings={listings} isGuest={!dealer} />
    </MarketplaceChrome>
  );
}
