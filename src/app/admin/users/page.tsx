import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import { isAuthenticated } from "@/lib/auth";
import { isDemoMode } from "@/lib/crm";

export default async function AdminUsersPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  return (
    <AdminChrome demo={isDemoMode()}>
      <AdminUsersClient />
    </AdminChrome>
  );
}
