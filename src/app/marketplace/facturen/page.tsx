import { redirect } from "next/navigation";
import { DealerFacturenClient } from "@/components/marketplace/DealerFacturenClient";
import { MarketplaceChrome } from "@/components/marketplace/MarketplaceChrome";
import { isDemoMode } from "@/lib/crm";
import { getDealerSession } from "@/lib/dealer-auth";
import { crmListInvoicesForBuyer } from "@/lib/invoices";

export default async function DealerFacturenPage() {
  const dealer = await getDealerSession();
  if (!dealer) redirect("/dealer/login");

  const invoices = await crmListInvoicesForBuyer(dealer.buyerId, {
    includeDrafts: false,
  });

  return (
    <MarketplaceChrome dealer={dealer} demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Facturen</h1>
          <p className="crm-subtitle">
            Facturen van heftruckverkocht.nl naar jouw bedrijf
          </p>
        </div>
      </div>
      <DealerFacturenClient invoices={invoices} />
    </MarketplaceChrome>
  );
}
