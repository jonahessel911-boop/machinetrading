"use client";

import type { Invoice } from "@/lib/invoices";
import { INVOICE_STATUS_LABELS } from "@/lib/invoices";
import { formatEuro } from "@/lib/status";

function statusClass(status: Invoice["status"]) {
  if (status === "betaald") return "crm-badge crm-badge-deal";
  if (status === "verstuurd") return "crm-badge crm-badge-contact";
  if (status === "geannuleerd") return "crm-badge crm-badge-dead";
  return "crm-badge";
}

export function DealerFacturenClient({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="crm-card">
      <div className="crm-card-head">
        Jouw facturen · {invoices.length}
      </div>
      <div
        className="crm-table-wrap"
        style={{ border: "none", boxShadow: "none" }}
      >
        <table className="crm-table">
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Datum</th>
              <th>Omschrijving</th>
              <th>Status</th>
              <th>Bedrag excl.</th>
              <th>BTW</th>
              <th>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <strong>{inv.invoiceNumber}</strong>
                </td>
                <td>{inv.issueDate}</td>
                <td>{inv.description || "—"}</td>
                <td>
                  <span className={statusClass(inv.status)}>
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </span>
                </td>
                <td>{formatEuro(inv.amountExBtw)}</td>
                <td>
                  {formatEuro(inv.btwAmount)}
                  <div className="crm-muted">{inv.btwPct}%</div>
                </td>
                <td>
                  <strong>{formatEuro(inv.amountIncBtw)}</strong>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7}>Nog geen facturen.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
