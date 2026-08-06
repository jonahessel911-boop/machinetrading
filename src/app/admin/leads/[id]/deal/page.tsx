import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { DealPageClient } from "@/components/admin/DealPageClient";
import { crmListAdminUsers } from "@/lib/admin-users";
import { isAuthenticated } from "@/lib/auth";
import { getCompanyInfo } from "@/lib/company";
import { salesRepOptions } from "@/lib/constants";
import {
  crmGetLead,
  crmListBuyersSimple,
  isDemoMode,
} from "@/lib/crm";

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { id } = await params;
  const [lead, buyers, users] = await Promise.all([
    crmGetLead(id),
    crmListBuyersSimple(),
    crmListAdminUsers().catch(() => []),
  ]);

  if (!lead) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <h1 className="crm-title">Lead niet gevonden</h1>
      </AdminChrome>
    );
  }

  return (
    <AdminChrome demo={isDemoMode()}>
      <DealPageClient
        initialLead={lead}
        buyers={buyers}
        company={getCompanyInfo()}
        salesReps={salesRepOptions(users.map((u) => u.naam))}
      />
    </AdminChrome>
  );
}
