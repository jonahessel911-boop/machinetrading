import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { DealPageClient } from "@/components/admin/DealPageClient";
import { isAuthenticated } from "@/lib/auth";
import { getCompanyInfo } from "@/lib/company";
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
  const [lead, buyers] = await Promise.all([
    crmGetLead(id),
    crmListBuyersSimple(),
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
      />
    </AdminChrome>
  );
}
