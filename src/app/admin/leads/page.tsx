import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { ClickableRow } from "@/components/admin/ClickableRow";
import { isAuthenticated } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/constants";
import { crmListLeads, isDemoMode } from "@/lib/crm";
import { formatAddress } from "@/lib/mappers";
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

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; archive?: string; q?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const params = await searchParams;
  const status = params.status;
  const archive = params.archive === "1";
  const q = params.q?.trim();

  let leads;
  try {
    leads = await crmListLeads({ status, archive, q });
  } catch (err) {
    return (
      <AdminChrome demo={isDemoMode()}>
        <div
          className="crm-toast"
          style={{
            background: "#fef1ee",
            color: "#ba0517",
            borderColor: "#fdd4d0",
          }}
        >
          Databasefout: {err instanceof Error ? err.message : "Onbekend"}
        </div>
      </AdminChrome>
    );
  }

  const filterLabel = q
    ? `Zoekresultaat “${q}”`
    : status
      ? (STATUS_LABELS[status] ?? status)
      : archive
        ? "Alles"
        : "Actief";

  return (
    <AdminChrome demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Leads</h1>
          <p className="crm-subtitle">
            {filterLabel} · {leads.length} records
          </p>
        </div>
      </div>

      <div className="crm-filter-bar">
        <Link className="crm-btn" href="/admin/leads">
          Actief
        </Link>
        <Link className="crm-btn" href="/admin/leads?archive=1">
          Inclusief geen contact
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=nieuw">
          Nieuw
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=deal">
          Deal
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=geen_interesse">
          Geen interesse
        </Link>
        <Link
          className="crm-btn"
          href="/admin/leads?status=verkeerd_telefoonnummer"
        >
          Verkeerd nummer
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=geen_contact">
          Geen contact
        </Link>
      </div>

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Adres</th>
              <th>Machine</th>
              <th>Timing</th>
              <th>Status</th>
              <th>Foto&apos;s</th>
              <th>Koper</th>
              <th>Aangemeld</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <ClickableRow key={lead.id} href={`/admin/leads/${lead.id}`}>
                <td>
                  <strong>{lead.naam}</strong>
                  <div className="crm-muted">{lead.telefoon}</div>
                  <div className="crm-muted">{lead.email}</div>
                </td>
                <td>{formatAddress(lead)}</td>
                <td>
                  {lead.merk} {lead.model}
                </td>
                <td>{lead.timing}</td>
                <td>
                  <span className={badgeClass(lead.status)}>
                    {labelForStatus(lead.status, lead.contactAttempts)}
                  </span>
                </td>
                <td>{lead.photos?.length ?? 0}</td>
                <td>{lead.buyer?.bedrijf ?? "—"}</td>
                <td>{formatDateTime(lead.createdAt)}</td>
              </ClickableRow>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={8}>Geen leads gevonden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminChrome>
  );
}
