import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { LeadDetailClient } from "@/components/admin/LeadDetailClient";
import { isAuthenticated } from "@/lib/auth";
import {
  crmGetLead,
  crmListBuyersSimple,
  isDemoMode,
} from "@/lib/crm";
import { mpGetByLeadId } from "@/lib/marketplace-data";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { id } = await params;
  const [lead, buyers, listing] = await Promise.all([
    crmGetLead(id),
    crmListBuyersSimple(),
    mpGetByLeadId(id),
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
      <LeadDetailClient
        initialLead={lead}
        buyers={buyers}
        initialListing={listing}
      />
    </AdminChrome>
  );
}
