import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { KopersClient } from "@/components/admin/KopersClient";
import { isAuthenticated } from "@/lib/auth";
import { crmListBuyers, isDemoMode } from "@/lib/crm";
import { crmBuyerDealPoints } from "@/lib/period-data";

export default async function KopersPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  try {
    const [buyers, dealPoints] = await Promise.all([
      crmListBuyers(),
      crmBuyerDealPoints(),
    ]);

    return (
      <AdminChrome demo={isDemoMode()}>
        <div className="crm-page-header">
          <div>
            <h1 className="crm-title">Kopers / Handelaren</h1>
            <p className="crm-subtitle">
              Overzicht per periode · klik een rij voor dealerinfo
            </p>
          </div>
        </div>
        <KopersClient initialBuyers={buyers} dealPoints={dealPoints} />
      </AdminChrome>
    );
  } catch (err) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <div
          className="crm-toast"
          style={{ background: "#fef1ee", color: "#ba0517" }}
        >
          {err instanceof Error ? err.message : "Fout"}
        </div>
      </AdminChrome>
    );
  }
}
