"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClickableRow } from "@/components/admin/ClickableRow";
import type { Invoice } from "@/lib/invoices";
import { INVOICE_STATUS_LABELS } from "@/lib/invoices";
import type { BuyerBid } from "@/lib/lead-bids";
import type { BuyerDealPoint } from "@/lib/period-data";
import {
  PERIOD_PRESETS,
  rangeForPreset,
  type PeriodPreset,
} from "@/lib/periods";
import type { LeadSelection } from "@/lib/selections";
import { formatDateTime, formatEuro, formatEuroK } from "@/lib/status";

type Buyer = {
  id: string;
  naam: string;
  bedrijf: string;
  email: string | null;
  telefoon: string | null;
  dealerUsername: string | null;
  dealerEnabled: boolean;
  hasDealerPassword: boolean;
  notities: string;
  dailyDigest: boolean;
};

type DealerDraft = {
  bedrijf: string;
  naam: string;
  email: string;
  telefoon: string;
  notities: string;
  dailyDigest: boolean;
};

function draftFromBuyer(b: Buyer): DealerDraft {
  return {
    bedrijf: b.bedrijf,
    naam: b.naam,
    email: b.email ?? "",
    telefoon: b.telefoon ?? "",
    notities: b.notities ?? "",
    dailyDigest: b.dailyDigest,
  };
}

function draftsEqual(a: DealerDraft, b: DealerDraft): boolean {
  return (
    a.bedrijf === b.bedrijf &&
    a.naam === b.naam &&
    a.email === b.email &&
    a.telefoon === b.telefoon &&
    a.notities === b.notities &&
    a.dailyDigest === b.dailyDigest
  );
}

export function KoperDetailClient({
  buyer: initialBuyer,
  deals,
  initialInvoices,
  selections,
  bids,
}: {
  buyer: Buyer;
  deals: BuyerDealPoint[];
  initialInvoices: Invoice[];
  selections: LeadSelection[];
  bids: BuyerBid[];
}) {
  const router = useRouter();
  const [buyer, setBuyer] = useState(initialBuyer);
  const [draft, setDraft] = useState(() => draftFromBuyer(initialBuyer));
  const [invoices, setInvoices] = useState(initialInvoices);
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = !draftsEqual(draft, draftFromBuyer(buyer));

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

  function updateDraft<K extends keyof DealerDraft>(
    key: K,
    value: DealerDraft[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function saveDealer() {
    const bedrijf = draft.bedrijf.trim();
    const naam = draft.naam.trim();
    if (!bedrijf) {
      setMessage("Bedrijfsnaam mag niet leeg zijn.");
      return;
    }
    if (!naam) {
      setMessage("Contactnaam mag niet leeg zijn.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/buyers/${buyer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedrijf,
          naam,
          email: draft.email.trim() || null,
          telefoon: draft.telefoon.trim() || null,
          notities: draft.notities,
          dailyDigest: draft.dailyDigest,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setBuyer(data);
      setDraft(draftFromBuyer(data));
      setMessage("Dealergegevens opgeslagen.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    setDraft(draftFromBuyer(buyer));
    setMessage("");
  }

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
      setDraft(draftFromBuyer(data));
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
            disabled={busy || saving}
            onClick={setDealerLogin}
          >
            Dealer login
          </button>
          <button
            type="button"
            className="crm-btn"
            disabled={busy || saving}
            onClick={removeBuyer}
          >
            Verwijderen
          </button>
        </div>
      </div>

      {message && <div className="crm-toast">{message}</div>}

      <div className="crm-table-wrap" style={{ marginBottom: "1rem" }}>
        <table className="crm-table crm-table--props">
          <thead>
            <tr>
              <th className="crm-table-section-label" colSpan={2}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>Dealergegevens</span>
                  <div className="crm-actions" style={{ margin: 0, gap: "0.4rem" }}>
                    {dirty ? (
                      <button
                        type="button"
                        className="crm-btn"
                        disabled={saving}
                        onClick={resetDraft}
                      >
                        Annuleren
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="crm-btn crm-btn-primary"
                      disabled={!dirty || saving}
                      onClick={() => {
                        void saveDealer();
                      }}
                    >
                      {saving ? "Opslaan…" : "Opslaan"}
                    </button>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Bedrijf</th>
              <td>
                <input
                  className="crm-input"
                  value={draft.bedrijf}
                  disabled={saving}
                  onChange={(e) => updateDraft("bedrijf", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">Contact</th>
              <td>
                <input
                  className="crm-input"
                  value={draft.naam}
                  disabled={saving}
                  onChange={(e) => updateDraft("naam", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">E-mail</th>
              <td>
                <input
                  className="crm-input"
                  type="email"
                  value={draft.email}
                  disabled={saving}
                  onChange={(e) => updateDraft("email", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">Telefoon</th>
              <td>
                <input
                  className="crm-input"
                  type="tel"
                  value={draft.telefoon}
                  disabled={saving}
                  onChange={(e) => updateDraft("telefoon", e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">Marketplace login</th>
              <td>
                {buyer.dealerUsername ? (
                  <>
                    <a href={`mailto:${buyer.dealerUsername}`}>
                      {buyer.dealerUsername}
                    </a>
                    <span className="crm-muted" style={{ marginLeft: "0.5rem" }}>
                      {buyer.dealerEnabled ? "· Actief" : "· Uit"}
                    </span>
                  </>
                ) : (
                  <span className="crm-muted">Geen login</span>
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Aanbod van de dag</th>
              <td>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.55rem",
                    cursor: "pointer",
                    fontWeight: 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.dailyDigest}
                    disabled={saving}
                    onChange={(e) =>
                      updateDraft("dailyDigest", e.target.checked)
                    }
                    style={{ marginTop: "0.2rem" }}
                  />
                  <span>
                    Ontvangt elke dag een mail met nieuwe marketplace-heftrucks
                    (alleen als er die dag minstens één is geplaatst).
                  </span>
                </label>
              </td>
            </tr>
            <tr>
              <th scope="row">Notities</th>
              <td>
                <textarea
                  className="crm-input"
                  rows={4}
                  value={draft.notities}
                  placeholder="Bijv. gebeld op…, interesse in…, afspraak…"
                  disabled={saving}
                  onChange={(e) => updateDraft("notities", e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="crm-table-wrap" style={{ marginBottom: "1rem" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th className="crm-table-section-label" colSpan={4}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>Periode totals</span>
                  <label
                    className="dash-select-wrap"
                    style={{ margin: 0, display: "inline-flex", gap: "0.4rem" }}
                  >
                    <span className="crm-muted" style={{ textTransform: "none" }}>
                      Periode
                    </span>
                    <select
                      className="crm-select"
                      value={period}
                      onChange={(e) =>
                        setPeriod(e.target.value as PeriodPreset)
                      }
                    >
                      {PERIOD_PRESETS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </th>
            </tr>
            <tr>
              <th>Deals</th>
              <th>Bem. Vol</th>
              <th>Omzet</th>
              <th>Winst</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{totals.deals}</strong>
              </td>
              <td>
                <strong>{formatEuroK(totals.waarde)}</strong>
              </td>
              <td>
                <strong>{formatEuroK(totals.omzet)}</strong>
              </td>
              <td>
                <strong>{formatEuro(totals.winst)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="crm-table-wrap" style={{ marginBottom: "1rem" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th className="crm-table-section-label" colSpan={4}>
                Biedingen · {bids.length}
              </th>
            </tr>
            <tr>
              <th>Heftruck</th>
              <th>Lead</th>
              <th>Bod</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <ClickableRow key={b.id} href={`/admin/leads/${b.leadId}`}>
                <td>
                  <strong>
                    {b.leadMerk}
                    {b.leadModel ? ` ${b.leadModel}` : ""}
                  </strong>
                </td>
                <td>{b.leadNaam}</td>
                <td>
                  <strong>{formatEuro(b.bedrag)}</strong>
                </td>
                <td>{formatDateTime(b.createdAt)}</td>
              </ClickableRow>
            ))}
            {bids.length === 0 && (
              <tr>
                <td colSpan={4}>Nog geen biedingen van deze handelaar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="crm-table-wrap" style={{ marginBottom: "1rem" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th className="crm-table-section-label" colSpan={5}>
                Verstuurde selecties · {selections.length}
              </th>
            </tr>
            <tr>
              <th>Selectie</th>
              <th>Heftrucks</th>
              <th>Verstuurd naar</th>
              <th>Datum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {selections.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.naam}</strong>
                </td>
                <td>{s.leadIds.length}</td>
                <td>
                  {s.recipientNaam || "—"}
                  {s.recipientEmail ? (
                    <div className="crm-muted">{s.recipientEmail}</div>
                  ) : null}
                </td>
                <td>{formatDateTime(s.createdAt)}</td>
                <td>
                  <a
                    className="crm-btn"
                    href={s.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open link
                  </a>
                </td>
              </tr>
            ))}
            {selections.length === 0 && (
              <tr>
                <td colSpan={5}>
                  Nog geen selecties naar deze handelaar verstuurd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="crm-table-wrap" style={{ marginBottom: "1rem" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th className="crm-table-section-label" colSpan={6}>
                Deals in periode · {filtered.length}
              </th>
            </tr>
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
              <ClickableRow key={d.leadId} href={`/admin/leads/${d.leadId}`}>
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

      <div className="crm-table-wrap" style={{ marginBottom: "1rem" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th className="crm-table-section-label" colSpan={5}>
                Facturen · {invoices.length}
              </th>
            </tr>
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
                  <div
                    className="crm-actions"
                    style={{ margin: 0, gap: "0.4rem" }}
                  >
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
    </>
  );
}
