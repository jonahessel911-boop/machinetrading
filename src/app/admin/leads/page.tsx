import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { LeadsTableClient } from "@/components/admin/LeadsTableClient";
import { isAuthenticated } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/constants";
import { crmListLeads, isDemoMode } from "@/lib/crm";

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
        <Link className="crm-btn" href="/admin/leads?status=terugbellen">
          Terugbellen
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=afwachten_fotos">
          Afwachten foto&apos;s
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=in_bemiddeling">
          In bemiddeling
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=bod_doorgegeven">
          Bod doorgestuurd
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=deal">
          Deal
        </Link>
        <Link className="crm-btn" href="/admin/leads?status=geen_interesse">
          Geen interesse
        </Link>
        <Link
          className="crm-btn"
          href="/admin/leads?status=onrealistische_prijs"
        >
          Onrealistische prijs
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

      <LeadsTableClient leads={leads} />
    </AdminChrome>
  );
}
