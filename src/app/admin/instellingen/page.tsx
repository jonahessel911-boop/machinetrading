import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminSettingsClient } from "@/components/admin/AdminSettingsClient";
import { isAuthenticated } from "@/lib/auth";
import { isDemoMode } from "@/lib/crm";

export default async function AdminInstellingenPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  return (
    <AdminChrome demo={isDemoMode()}>
      <AdminSettingsClient />
    </AdminChrome>
  );
}
