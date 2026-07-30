import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { PeriodOverview } from "@/components/admin/PeriodOverview";
import { isAuthenticated } from "@/lib/auth";
import { isDemoMode } from "@/lib/crm";
import { crmDashboardSeries } from "@/lib/period-data";

export default async function RapportagePage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const series = await crmDashboardSeries();

  return (
    <AdminChrome demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Rapportage</h1>
          <p className="crm-subtitle">
            Periode overzicht · jaar → maand → week → dag
          </p>
        </div>
      </div>

      <PeriodOverview
        deals={series.deals}
        leads={series.leads}
        costs={series.costs}
      />
    </AdminChrome>
  );
}
