import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { KoperDetailClient } from "@/components/admin/KoperDetailClient";
import { isAuthenticated } from "@/lib/auth";
import { crmListBuyersSimple, isDemoMode } from "@/lib/crm";
import { crmListInvoicesForBuyer } from "@/lib/invoices";
import { crmListBidsForBuyer } from "@/lib/lead-bids";
import { crmBuyerDealPoints } from "@/lib/period-data";
import { crmListSelectionsForBuyer } from "@/lib/selections";

export default async function KoperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { id } = await params;
  const [buyers, deals, invoices] = await Promise.all([
    crmListBuyersSimple(),
    crmBuyerDealPoints(),
    crmListInvoicesForBuyer(id),
  ]);

  const buyer = buyers.find((b) => b.id === id);
  if (!buyer) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <h1 className="crm-title">Koper niet gevonden</h1>
      </AdminChrome>
    );
  }

  const [selections, bids] = await Promise.all([
    crmListSelectionsForBuyer({
      buyerId: buyer.id,
      email: buyer.email,
    }),
    crmListBidsForBuyer({
      buyerId: buyer.id,
      email: buyer.email,
      dealerUsername: buyer.dealerUsername,
      bedrijf: buyer.bedrijf,
    }),
  ]);

  return (
    <AdminChrome demo={isDemoMode()}>
      <KoperDetailClient
        buyer={buyer}
        deals={deals}
        initialInvoices={invoices}
        selections={selections}
        bids={bids}
      />
    </AdminChrome>
  );
}
