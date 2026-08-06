import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { LeadDetailClient } from "@/components/admin/LeadDetailClient";
import { crmListAdminUsers } from "@/lib/admin-users";
import { isAuthenticated } from "@/lib/auth";
import { salesRepOptions } from "@/lib/constants";
import { crmGetLead, isDemoMode } from "@/lib/crm";
import { crmListLeadBids } from "@/lib/lead-bids";
import { mpGetByLeadId } from "@/lib/marketplace-data";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { id } = await params;
  const [lead, listing, bids, users] = await Promise.all([
    crmGetLead(id),
    mpGetByLeadId(id),
    crmListLeadBids(id).catch(() => []),
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
      <LeadDetailClient
        initialLead={lead}
        initialListing={listing}
        initialBids={bids}
        salesReps={salesRepOptions(users.map((u) => u.naam))}
      />
    </AdminChrome>
  );
}
