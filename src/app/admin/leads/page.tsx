import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { LeadsTableClient } from "@/components/admin/LeadsTableClient";
import { isAuthenticated } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/constants";
import { crmListLeads, isDemoMode } from "@/lib/crm";

function buildLeadsHref(opts: {
  status?: string;
  activeOnly?: boolean;
  q?: string;
  page?: number;
}) {
  const sp = new URLSearchParams();
  if (opts.status) sp.set("status", opts.status);
  if (opts.activeOnly) sp.set("active", "1");
  if (opts.q) sp.set("q", opts.q);
  if (opts.page && opts.page > 1) sp.set("page", String(opts.page));
  const qs = sp.toString();
  return qs ? `/admin/leads?${qs}` : "/admin/leads";
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    archive?: string;
    active?: string;
    q?: string;
    page?: string;
  }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const params = await searchParams;
  const status = params.status;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 50;

  // Default = alle leads. ?active=1 verbergt status geen_contact.
  // Legacy ?archive=1 blijft alles tonen.
  const showActiveOnly = params.active === "1";

  let list;
  try {
    list = await crmListLeads({
      status,
      activeOnly: showActiveOnly,
      archive: !showActiveOnly,
      q,
      page,
      pageSize,
    });
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

  const { leads, total } = list;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const filterLabel = q
    ? `Zoekresultaat “${q}”`
    : status
      ? (STATUS_LABELS[status] ?? status)
      : showActiveOnly
        ? "Actief (zonder geen contact)"
        : "Alles";

  const base = { status, activeOnly: showActiveOnly, q };

  return (
    <AdminChrome demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Leads</h1>
          <p className="crm-subtitle">
            {filterLabel} · {total} records
            {total > 0 ? ` · ${from}–${to}` : ""}
          </p>
        </div>
      </div>

      <div className="crm-filter-bar">
        <Link className="crm-btn" href="/admin/leads">
          Alles
        </Link>
        <Link className="crm-btn" href="/admin/leads?active=1">
          Zonder geen contact
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
        <Link className="crm-btn" href="/admin/leads?status=koper_zoeken">
          Koper zoeken
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

      {totalPages > 1 ? (
        <nav className="crm-pagination" aria-label="Paginering">
          {safePage > 1 ? (
            <Link
              className="crm-btn"
              href={buildLeadsHref({ ...base, page: safePage - 1 })}
            >
              Vorige
            </Link>
          ) : (
            <span className="crm-btn" aria-disabled="true">
              Vorige
            </span>
          )}
          <span className="crm-pagination-info">
            Pagina {safePage} van {totalPages}
          </span>
          {safePage < totalPages ? (
            <Link
              className="crm-btn"
              href={buildLeadsHref({ ...base, page: safePage + 1 })}
            >
              Volgende
            </Link>
          ) : (
            <span className="crm-btn" aria-disabled="true">
              Volgende
            </span>
          )}
        </nav>
      ) : null}
    </AdminChrome>
  );
}
