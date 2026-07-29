import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { KoperDetailClient } from "@/components/admin/KoperDetailClient";
import { isAuthenticated } from "@/lib/auth";
import { crmListBuyersSimple, isDemoMode } from "@/lib/crm";
import { crmBuyerDealPoints } from "@/lib/period-data";

export default async function KoperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { id } = await params;
  const [buyers, deals] = await Promise.all([
    crmListBuyersSimple(),
    crmBuyerDealPoints(),
  ]);

  const buyer = buyers.find((b) => b.id === id);
  if (!buyer) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <h1 className="crm-title">Koper niet gevonden</h1>
      </AdminChrome>
    );
  }

  return (
    <AdminChrome demo={isDemoMode()}>
      <KoperDetailClient buyer={buyer} deals={deals} />
    </AdminChrome>
  );
}
