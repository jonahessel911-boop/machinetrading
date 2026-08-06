import Link from "next/link";
import { formatDateTime } from "@/lib/status";
import type { LeadSelectionAdmin } from "@/lib/selections";

export function SelectiesTable({
  selections,
}: {
  selections: LeadSelectionAdmin[];
}) {
  return (
    <div className="crm-card">
      <div className="crm-card-head">
        Alle selecties · {selections.length}
      </div>
      <div
        className="crm-table-wrap"
        style={{ border: "none", boxShadow: "none" }}
      >
        <table className="crm-table">
          <thead>
            <tr>
              <th>Selectie</th>
              <th>Gemaakt door</th>
              <th>Verstuurd naar</th>
              <th>Koper</th>
              <th>Heftrucks</th>
              <th>Geopend</th>
              <th>Verstuurd</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {selections.map((s) => {
              const opened = s.viewCount > 0;
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.naam}</strong>
                  </td>
                  <td>{s.createdByNaam || "—"}</td>
                  <td>
                    {s.recipientNaam || "—"}
                    {s.recipientEmail ? (
                      <div className="crm-muted">{s.recipientEmail}</div>
                    ) : null}
                  </td>
                  <td>
                    {s.buyerId ? (
                      <Link href={`/admin/kopers/${s.buyerId}`}>
                        {s.buyerBedrijf || s.buyerNaam || "Koper"}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {s.buyerBedrijf && s.buyerNaam ? (
                      <div className="crm-muted">{s.buyerNaam}</div>
                    ) : null}
                  </td>
                  <td>{s.leadIds.length}</td>
                  <td>
                    {opened ? (
                      <>
                        <span className="crm-account-status crm-account-status--ok">
                          <span aria-hidden="true">✓</span>{" "}
                          {s.viewCount}×
                        </span>
                        {s.lastViewedAt ? (
                          <div className="crm-muted">
                            Laatst {formatDateTime(s.lastViewedAt)}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="crm-account-status crm-account-status--pending">
                        <span aria-hidden="true">✕</span> Nog niet
                      </span>
                    )}
                  </td>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td>
                    <a
                      className="crm-btn"
                      href={s.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              );
            })}
            {selections.length === 0 && (
              <tr>
                <td colSpan={8}>
                  Nog geen selecties. Verstuur er een via Leads → selecteer
                  machines → Verstuur naar handelaar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
