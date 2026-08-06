import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { ClickableRow } from "@/components/admin/ClickableRow";
import { DashboardReport } from "@/components/admin/DashboardReport";
import { LeadPhotoThumb } from "@/components/admin/LeadPhotoThumb";
import { isAuthenticated } from "@/lib/auth";
import { crmListLeads, crmStats, isDemoMode } from "@/lib/crm";
import { mpLiveLeadIds } from "@/lib/marketplace-data";
import { crmDashboardSeries } from "@/lib/period-data";
import { formatDateTime, labelForStatus, leadStatusBadgeClass } from "@/lib/status";

function badgeClass(status: string) {
  return leadStatusBadgeClass(status);
}

function MarketplaceIcon({ live }: { live: boolean }) {
  return (
    <span
      className={live ? "crm-mp-icon is-live" : "crm-mp-icon"}
      title={live ? "Op de veiling" : "Niet op de veiling"}
      aria-label={live ? "Op de veiling" : "Niet op de veiling"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 9l1.5-6h15L21 9" />
        <path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />
        <path d="M3 9h18" />
        <path d="M9 20V12h6v8" />
      </svg>
    </span>
  );
}

export default async function AdminDashboardPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [stats, recentResult, series] = await Promise.all([
    crmStats(),
    crmListLeads({ page: 1, pageSize: 10 }),
    crmDashboardSeries(),
  ]);

  const recent = recentResult.leads;
  const liveOnMarketplace = await mpLiveLeadIds(recent.map((l) => l.id));

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
                    <strong className="crm-lead-name">
                      {lead.naam}
                      <MarketplaceIcon
                        live={liveOnMarketplace.has(lead.id)}
                      />
                    </strong>
                    <div className="crm-muted">{lead.telefoon}</div>
                    <div className="crm-muted">{lead.email}</div>
                  </td>
                  <td>
                    {lead.merk} {lead.model}
                  </td>
                  <td>
                    <span className={badgeClass(lead.status)}>
                      {labelForStatus(lead.status, lead.contactAttempts)}
                    </span>
                  </td>
                  <td>
                    <LeadPhotoThumb photos={lead.photos} />
                  </td>
                  <td>{formatDateTime(lead.createdAt)}</td>
                </ClickableRow>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5}>Nog geen leads.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminChrome>
  );
}
