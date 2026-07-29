import { redirect } from "next/navigation";
import { DealerInstellingenClient } from "@/components/marketplace/DealerInstellingenClient";
import { MarketplaceChrome } from "@/components/marketplace/MarketplaceChrome";
import { isDemoMode } from "@/lib/crm";
import { getDealerSession } from "@/lib/dealer-auth";
import { crmGetInvoiceSettings } from "@/lib/invoices";

export default async function DealerInstellingenPage() {
  const dealer = await getDealerSession();
  if (!dealer) redirect("/dealer/login");

  const settings = (await crmGetInvoiceSettings(dealer.buyerId)) ?? {
    invoiceBedrijf: dealer.bedrijf,
    invoiceContact: dealer.naam,
    invoiceEmail: dealer.email,
    invoiceTelefoon: dealer.telefoon,
    invoiceStraat: null,
    invoiceHuisnummer: null,
    invoicePostcode: null,
    invoiceWoonplaats: null,
    invoiceLand: "Nederland",
    invoiceKvk: null,
    invoiceBtw: null,
    invoiceIban: null,
    invoiceBic: null,
  };

  // Prefill empty settings with session defaults
  if (!settings.invoiceBedrijf) settings.invoiceBedrijf = dealer.bedrijf;
  if (!settings.invoiceContact) settings.invoiceContact = dealer.naam;
  if (!settings.invoiceEmail) settings.invoiceEmail = dealer.email;
  if (!settings.invoiceTelefoon) settings.invoiceTelefoon = dealer.telefoon;

  return (
    <MarketplaceChrome dealer={dealer} demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Instellingen</h1>
          <p className="crm-subtitle">Factuurgegevens van jouw bedrijf</p>
        </div>
      </div>
      <DealerInstellingenClient initial={settings} />
    </MarketplaceChrome>
  );
}
