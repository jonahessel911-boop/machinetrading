import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { isAuthenticated } from "@/lib/auth";
import { isDemoMode } from "@/lib/crm";
import { listingTitle } from "@/lib/marketplace";
import { mpListAllAdmin } from "@/lib/marketplace-data";
import { formatDateTime, formatEuro } from "@/lib/status";
import { AdminMarketplaceActions } from "@/components/admin/AdminMarketplaceActions";

export default async function AdminMarketplacePage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const listings = await mpListAllAdmin();

  return (
    <AdminChrome demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-title">Marketplace</h1>
          <p className="crm-subtitle">
            Alle veilingen · standaard 7 dagen actief
          </p>
        </div>
        <Link href="/marketplace" className="crm-btn" target="_blank">
          Open publieke marketplace
        </Link>
      </div>

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Woonplaats</th>
              <th>Status</th>
              <th>Eindigt</th>
              <th>Biedingen</th>
              <th>Link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{listingTitle(l)}</strong>
                  <div className="crm-muted">
                    <Link href={`/admin/leads/${l.leadId}`}>Lead openen</Link>
                  </div>
                </td>
                <td>{l.woonplaats}</td>
                <td>
                  <span
                    className={
                      l.isLive
                        ? "crm-badge crm-badge-deal"
                        : "crm-badge crm-badge-dead"
                    }
                  >
                    {l.isLive ? "Actief" : l.status}
                  </span>
                </td>
                <td>{formatDateTime(l.endsAt)}</td>
                <td>
                  {l.bidCount ?? 0}
                  {l.highestBid != null
                    ? ` · ${formatEuro(l.highestBid)}`
                    : ""}
                </td>
                <td>
                  <Link href={l.publicUrl!} target="_blank">
                    /marketplace/{l.slug}
                  </Link>
                </td>
                <td>
                  <AdminMarketplaceActions
                    listingId={l.id}
                    isLive={!!l.isLive}
                  />
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan={7}>Nog geen marketplace listings.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminChrome>
  );
}
