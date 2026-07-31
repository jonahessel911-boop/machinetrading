import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { ClickableRow } from "@/components/admin/ClickableRow";
import { DashboardReport } from "@/components/admin/DashboardReport";
import { isAuthenticated } from "@/lib/auth";
import { crmListLeads, crmStats, isDemoMode } from "@/lib/crm";
import { crmDashboardSeries } from "@/lib/period-data";
import { formatDateTime, labelForStatus } from "@/lib/status";

function badgeClass(status: string) {
  if (status === "nieuw") return "crm-badge crm-badge-nieuw";
  if (status === "deal") return "crm-badge crm-badge-deal";
  if (status.startsWith("contact_")) return "crm-badge crm-badge-contact";
  if (
    status === "geen_contact" ||
    status === "geen_interesse" ||
    status === "verkeerd_telefoonnummer"
  ) {
    return "crm-badge crm-badge-dead";
  }
  return "crm-badge";
}

export default async function AdminDashboardPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [stats, recent, series] = await Promise.all([
    crmStats(),
    crmListLeads({ limit: 10 }),
    crmDashboardSeries(),
  ]);

  return (
    <AdminChrome demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Home</h1>
          <p className="crm-subtitle">
            Overzicht van leads, deals en bemiddeling
          </p>
        </div>
        <Link
          href="/admin/leads?status=nieuw"
          className="crm-btn crm-btn-primary"
        >
          Nieuwe leads ({stats.nieuw})
        </Link>
      </div>

      <DashboardReport deals={series.deals} costs={series.costs} />

      <div className="crm-card" style={{ marginTop: "1rem" }}>
        <div className="crm-card-head">
          <span>Recente actieve leads</span>
          <Link href="/admin/leads">Alles bekijken</Link>
        </div>
        <div
          className="crm-table-wrap"
          style={{ border: "none", boxShadow: "none" }}
        >
          <table className="crm-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Adres</th>
                <th>Machine</th>
                <th>Status</th>
                <th>Foto&apos;s</th>
                <th>Aangemeld</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((lead) => (
                <ClickableRow key={lead.id} href={`/admin/leads/${lead.id}`}>
                  <td>
                    <strong>{lead.naam}</strong>
                    <div className="crm-muted">{lead.telefoon}</div>
                  </td>
                  <td>
                    {[lead.postcode, lead.woonplaats].filter(Boolean).join(" ")}
                  </td>
                  <td>
                    {lead.merk} {lead.model}
                  </td>
                  <td>
                    <span className={badgeClass(lead.status)}>
                      {labelForStatus(lead.status, lead.contactAttempts)}
                    </span>
                  </td>
                  <td>{lead.photos?.length ?? 0}</td>
                  <td>{formatDateTime(lead.createdAt)}</td>
                </ClickableRow>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6}>Nog geen leads.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminChrome>
  );
}
