import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { LeadCrOverview } from "@/components/admin/LeadCrOverview";
import { isAuthenticated } from "@/lib/auth";
import { isDemoMode } from "@/lib/crm";
import { crmFunnelLeadCr } from "@/lib/funnel-data";

export default async function LeadCrPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const sites = await crmFunnelLeadCr();

  return (
    <AdminChrome demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Lead CR</h1>
          <p className="crm-subtitle">
            Form funnel · waar bezoekers afhaken per website
          </p>
        </div>
      </div>

      <LeadCrOverview sites={sites} />
    </AdminChrome>
  );
}
