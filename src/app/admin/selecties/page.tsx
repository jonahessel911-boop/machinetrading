import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { SelectiesTable } from "@/components/admin/SelectiesTable";
import { isAuthenticated } from "@/lib/auth";
import { isDemoMode } from "@/lib/crm";
import { crmListSelectionsAdmin } from "@/lib/selections";

export default async function SelectiesPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  try {
    const selections = await crmListSelectionsAdmin();

    return (
      <AdminChrome demo={isDemoMode()}>
        <div className="crm-page-header">
          <div>
            <h1 className="crm-title">Selecties</h1>
            <p className="crm-subtitle">
              Verstuurde selecties · of de handelaar de link heeft geopend
            </p>
          </div>
        </div>
        <SelectiesTable selections={selections} />
      </AdminChrome>
    );
  } catch (err) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <div
          className="crm-toast"
          style={{ background: "#fef1ee", color: "#ba0517" }}
        >
          {err instanceof Error ? err.message : "Fout"}
        </div>
      </AdminChrome>
    );
  }
}
