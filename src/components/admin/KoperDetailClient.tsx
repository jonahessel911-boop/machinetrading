"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClickableRow } from "@/components/admin/ClickableRow";
import type { Invoice } from "@/lib/invoices";
import { INVOICE_STATUS_LABELS } from "@/lib/invoices";
import type { BuyerDealPoint } from "@/lib/period-data";
import {
  PERIOD_PRESETS,
  rangeForPreset,
  type PeriodPreset,
} from "@/lib/periods";
import { formatEuro, formatEuroK } from "@/lib/status";

type Buyer = {
  id: string;
  naam: string;
  bedrijf: string;
  email: string | null;
  telefoon: string | null;
  dealerUsername: string | null;
  dealerEnabled: boolean;
  hasDealerPassword: boolean;
};

export function KoperDetailClient({
  buyer: initialBuyer,
  deals,
  initialInvoices,
}: {
  buyer: Buyer;
  deals: BuyerDealPoint[];
  initialInvoices: Invoice[];
}) {
  const router = useRouter();
  const [buyer, setBuyer] = useState(initialBuyer);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const range = rangeForPreset(period);
    return deals.filter((d) => {
      if (d.buyerId !== buyer.id) return false;
      if (!range) return true;
      return d.date >= range.from && d.date <= range.to;
    });
  }, [deals, buyer.id, period]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, d) => {
        acc.deals += 1;
        acc.waarde += d.waarde;
        acc.omzet += d.omzet;
        acc.winst += d.winst;
        return acc;
      },
      { deals: 0, waarde: 0, omzet: 0, winst: 0 },
    );
  }, [filtered]);

  async function setDealerLogin() {
    const emailLogin = window.prompt(
      "Dealer e-mail (login)",
      buyer.dealerUsername ?? buyer.email ?? "",
    );
    if (emailLogin === null) return;
    const password = window.prompt(
      "Dealer wachtwoord (leeg = ongewijzigd)",
      "",
    );
    if (password === null) return;
    if (!emailLogin.trim()) {
      setMessage("E-mail mag niet leeg zijn.");
      return;
    }
    if (!buyer.hasDealerPassword && !password) {
      setMessage("Wachtwoord verplicht voor nieuwe dealer-login.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        dealerUsername: emailLogin.trim(),
        dealerEnabled: true,
      };
      if (password) body.dealerPassword = password;
      const res = await fetch(`/api/admin/buyers/${buyer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      setBuyer(data);
      setMessage("Dealer-login opgeslagen.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function removeBuyer() {
    if (!confirm("Koper verwijderen?")) return;
    setBusy(true);
    await fetch(`/api/admin/buyers/${buyer.id}`, { method: "DELETE" });
    router.push("/admin/kopers");
    router.refresh();
  }

  async function sendInvoice(invoiceId: string) {
    if (
      !confirm(
        "Factuur versturen naar de koper? Doe dit pas nadat de heftruck is opgehaald.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Versturen mislukt");
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? data.invoice : inv)),
      );
      setMessage(
        `Factuur ${data.invoice.invoiceNumber} verstuurd naar ${data.email.to}.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function downloadInvoicePdf(invoiceId: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Download mislukt");
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(dispo);
      const filename = match?.[1] || `factuur-${invoiceId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="crm-page-header">
        <div>
          <p className="crm-subtitle">
            <Link href="/admin/kopers">Kopers</Link> / {buyer.bedrijf}
          </p>
          <h1 className="crm-title">{buyer.bedrijf}</h1>
        </div>
        <div className="crm-actions" style={{ margin: 0 }}>
          <button
            type="button"
            className="crm-btn"
            disabled={busy}
            onClick={setDealerLogin}
          >
            Dealer login
          </button>
          <button
            type="button"
            className="crm-btn"
            disabled={busy}
            onClick={removeBuyer}
          >
            Verwijderen
          </button>
        </div>
      </div>

      {message && <div className="crm-toast">{message}</div>}

      <div className="crm-two">
        <div className="crm-card">
          <div className="crm-card-head">Dealerinfo</div>
          <div className="crm-card-body">
            <div className="crm-fields">
              <div className="crm-field">
                <label>Bedrijf</label>
                <div>{buyer.bedrijf}</div>
              </div>
              <div className="crm-field">
                <label>Contact</label>
                <div>{buyer.naam}</div>
              </div>
              <div className="crm-field">
                <label>E-mail</label>
                <div>
                  {buyer.email ? (
                    <a href={`mailto:${buyer.email}`}>{buyer.email}</a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="crm-field">
                <label>Telefoon</label>
                <div>
                  {buyer.telefoon ? (
                    <a href={`tel:${buyer.telefoon}`}>{buyer.telefoon}</a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="crm-field">
                <label>Marketplace login</label>
                <div>
                  {buyer.dealerUsername ? (
                    <>
                      <a href={`mailto:${buyer.dealerUsername}`}>
                        {buyer.dealerUsername}
                      </a>
                      <div className="crm-muted">
                        {buyer.dealerEnabled ? "Actief" : "Uit"}
                      </div>
                    </>
                  ) : (
                    <span className="crm-muted">Geen login</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="crm-card">
          <div className="crm-card-head">Periode totals</div>
          <div className="crm-card-body">
            <label className="dash-select-wrap" style={{ marginBottom: "0.75rem" }}>
              <span>Periode</span>
              <select
                className="crm-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="crm-grid crm-stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="crm-stat">
                <span>Deals</span>
                <strong>{totals.deals}</strong>
              </div>
              <div className="crm-stat">
                <span>Bem. Vol</span>
                <strong>{formatEuroK(totals.waarde)}</strong>
              </div>
              <div className="crm-stat">
                <span>Omzet</span>
                <strong>{formatEuroK(totals.omzet)}</strong>
              </div>
              <div className="crm-stat">
                <span>Winst</span>
                <strong>{formatEuro(totals.winst)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-card" style={{ marginTop: "1rem" }}>
        <div className="crm-card-head">
          Deals in periode ({filtered.length})
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
                <th>Datum</th>
                <th>Bem. Vol</th>
                <th>Omzet</th>
                <th>Winst</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <ClickableRow
                  key={d.leadId}
                  href={`/admin/leads/${d.leadId}`}
                >
                  <td>{d.naam}</td>
                  <td>
                    {d.merk} {d.model}
                  </td>
                  <td>{d.date}</td>
                  <td>{formatEuro(d.waarde)}</td>
                  <td>{formatEuro(d.omzet)}</td>
                  <td>{formatEuro(d.winst)}</td>
                </ClickableRow>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>Geen deals in deze periode.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="crm-card" style={{ marginTop: "1rem" }}>
        <div className="crm-card-head">
          Facturen · {invoices.length}
        </div>
        <div className="crm-card-body" style={{ paddingBottom: 0 }}>
          <p className="crm-muted" style={{ marginTop: 0 }}>
            Drafts ontstaan automatisch bij een koopovereenkomst. Factuurbedrag
            = marge (omzet). Verstuur pas nadat de heftruck is opgehaald.
          </p>
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
                <th>Status</th>
                <th>Bedrag (marge)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNumber}</td>
                  <td>{inv.issueDate}</td>
                  <td>{INVOICE_STATUS_LABELS[inv.status]}</td>
                  <td>
                    <strong>{formatEuro(inv.amountExBtw)}</strong>
                    <div className="crm-muted" style={{ fontSize: "0.8rem" }}>
                      incl. BTW {formatEuro(inv.amountIncBtw)}
                    </div>
                  </td>
                  <td>
                    <div className="crm-actions" style={{ margin: 0, gap: "0.4rem" }}>
                      <button
                        type="button"
                        className="crm-icon-btn"
                        title={
                          inv.status === "concept"
                            ? "Download factuur-draft PDF"
                            : "Download factuur PDF"
                        }
                        aria-label="Download factuur PDF"
                        disabled={busy}
                        onClick={() => downloadInvoicePdf(inv.id)}
                      >
                        ⬇
                      </button>
                      {inv.status === "concept" && (
                        <button
                          type="button"
                          className="crm-btn crm-btn-primary"
                          disabled={busy}
                          onClick={() => sendInvoice(inv.id)}
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5}>Nog geen facturen voor deze koper.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
