import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { CallSystemClient } from "@/components/admin/CallSystemClient";
import { isAuthenticated } from "@/lib/auth";
import { crmListCallQueue, isDemoMode } from "@/lib/crm";

export default async function BelSysteemPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  let leads = [];
  try {
    leads = await crmListCallQueue();
  } catch (err) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <h1 className="crm-title">Bel systeem</h1>
        <p className="crm-muted">
          {err instanceof Error ? err.message : "Laden mislukt"}
        </p>
      </AdminChrome>
    );
  }

  return (
    <AdminChrome demo={isDemoMode()}>
      <CallSystemClient initialLeads={leads} />
    </AdminChrome>
  );
}
