import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { PortalDashboard } from "@/components/PortalDashboard";

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) {
    redirect("/mijn");
  }

  return <PortalDashboard />;
}
