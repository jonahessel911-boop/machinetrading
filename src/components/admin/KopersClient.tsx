"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClickableRow } from "@/components/admin/ClickableRow";
import { KvkCompanySearch } from "@/components/KvkCompanySearch";
import type { BuyerPeriodStats, BuyerDealPoint } from "@/lib/period-data";
import { aggregateBuyersForPeriod } from "@/lib/period-data";
import {
  PERIOD_PRESETS,
  rangeForPreset,
  type PeriodPreset,
} from "@/lib/periods";
import { formatEuro, formatEuroK } from "@/lib/status";
import type { KvkCompanyProfile } from "@/lib/kvk";

type BuyerForm = {
  id: string;
  naam: string;
  bedrijf: string;
  email: string | null;
  telefoon: string | null;
  dealerUsername: string | null;
  dealerEnabled: boolean;
  hasDealerPassword: boolean;
};

const emptyForm = {
  naam: "",
  bedrijf: "",
  email: "",
  telefoon: "",
  dealerPassword: "",
  dealerEnabled: true,
  invoiceKvk: "",
  invoiceStraat: "",
  invoiceHuisnummer: "",
  invoicePostcode: "",
  invoiceWoonplaats: "",
  invoiceLand: "Nederland",
};

export function KopersClient({
  initialBuyers,
  dealPoints,
}: {
  initialBuyers: BuyerForm[];
  dealPoints: BuyerDealPoint[];
}) {
  const router = useRouter();
  const [buyers, setBuyers] = useState(initialBuyers);
  const [period, setPeriod] = useState<PeriodPreset>("last_30");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const rows: BuyerPeriodStats[] = useMemo(() => {
    const range = rangeForPreset(period);
    return aggregateBuyersForPeriod(
      buyers.map((b) => ({
        id: b.id,
        bedrijf: b.bedrijf,
        naam: b.naam,
        email: b.email,
        telefoon: b.telefoon,
        dealerUsername: b.dealerUsername,
        dealerEnabled: b.dealerEnabled,
      })),
      dealPoints,
      range?.from ?? null,
      range?.to ?? null,
    );
  }, [buyers, dealPoints, period]);

  async function refresh() {
    const res = await fetch("/api/admin/buyers");
    if (res.ok) setBuyers(await res.json());
    router.refresh();
  }

  function closeModal() {
    setOpen(false);
    setForm(emptyForm);
    setMessage("");
  }

  function applyKvk(profile: KvkCompanyProfile) {
    setForm((f) => ({
      ...f,
      bedrijf: profile.naam || f.bedrijf,
      invoiceKvk: profile.kvkNummer,
      invoiceStraat: profile.straat || "",
      invoiceHuisnummer: profile.huisnummer || "",
      invoicePostcode: profile.postcode || "",
      invoiceWoonplaats: profile.woonplaats || "",
      invoiceLand: profile.land || "Nederland",
    }));
  }

  async function createBuyer(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const email = form.email.trim();

    if (form.dealerPassword && !email) {
      setMessage("E-mail is verplicht als je een wachtwoord instelt.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: form.naam,
          bedrijf: form.bedrijf,
          email: email || null,
          telefoon: form.telefoon || null,
          dealerUsername: form.dealerPassword && email ? email : null,
          dealerPassword: form.dealerPassword || null,
          dealerEnabled: form.dealerEnabled,
          invoice: {
            invoiceBedrijf: form.bedrijf,
            invoiceContact: form.naam,
            invoiceEmail: email || null,
            invoiceTelefoon: form.telefoon || null,
            invoiceStraat: form.invoiceStraat || null,
            invoiceHuisnummer: form.invoiceHuisnummer || null,
            invoicePostcode: form.invoicePostcode || null,
            invoiceWoonplaats: form.invoiceWoonplaats || null,
            invoiceLand: form.invoiceLand || "Nederland",
            invoiceKvk: form.invoiceKvk || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      closeModal();
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        className="dash-report-controls"
        style={{
          marginBottom: "0.85rem",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <label className="dash-select-wrap">
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
        <button
          type="button"
          className="crm-btn crm-btn-primary"
          onClick={() => {
            setMessage("");
            setOpen(true);
          }}
        >
          Nieuwe koper
        </button>
      </div>

      <div className="crm-card">
        <div className="crm-card-head">
          Handelaren · {rows.length} · periode-filter actief
        </div>
        <div
          className="crm-table-wrap"
          style={{ border: "none", boxShadow: "none" }}
        >
          <table className="crm-table">
            <thead>
              <tr>
                <th>Bedrijfsnaam</th>
                <th>Deals</th>
                <th>Bem. Vol</th>
                <th>Omzet</th>
                <th>Winst</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ClickableRow
                  key={r.buyerId}
                  href={`/admin/kopers/${r.buyerId}`}
                >
                  <td>
                    <strong>{r.bedrijf}</strong>
                    <div className="crm-muted">{r.naam}</div>
                  </td>
                  <td>{r.deals}</td>
                  <td>{formatEuroK(r.waardeDeals)}</td>
                  <td>{formatEuroK(r.omzet)}</td>
                  <td>{formatEuro(r.winst)}</td>
                </ClickableRow>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>Nog geen kopers.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div
          className="crm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="crm-modal">
            <div className="crm-modal-head">
              <h2>Nieuwe koper</h2>
              <button type="button" className="crm-btn" onClick={closeModal}>
                Sluiten
              </button>
            </div>
            <div className="crm-modal-body">
              <form className="crm-form" onSubmit={createBuyer}>
                <KvkCompanySearch onSelect={applyKvk} />

                <label>
                  Bedrijf
                  <input
                    className="crm-input"
                    required
                    value={form.bedrijf}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bedrijf: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Contactpersoon
                  <input
                    className="crm-input"
                    required
                    value={form.naam}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, naam: e.target.value }))
                    }
                  />
                </label>
                <label>
                  E-mail
                  <input
                    className="crm-input"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="naam@bedrijf.nl"
                  />
                </label>
                <label>
                  Telefoon
                  <input
                    className="crm-input"
                    value={form.telefoon}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, telefoon: e.target.value }))
                    }
                  />
                </label>

                {(form.invoiceKvk || form.invoiceStraat) && (
                  <p className="crm-muted" style={{ margin: 0 }}>
                    KvK {form.invoiceKvk || "—"}
                    {form.invoiceStraat
                      ? ` · ${form.invoiceStraat} ${form.invoiceHuisnummer}, ${form.invoicePostcode} ${form.invoiceWoonplaats}`
                      : ""}
                  </p>
                )}

                <hr className="crm-form-hr" />
                <p className="crm-muted" style={{ margin: 0 }}>
                  Marketplace-login — e-mail + wachtwoord
                </p>
                <label>
                  Wachtwoord
                  <input
                    className="crm-input"
                    type="password"
                    value={form.dealerPassword}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dealerPassword: e.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    placeholder="Leeg = geen login"
                  />
                </label>
                <label className="crm-check">
                  <input
                    type="checkbox"
                    checked={form.dealerEnabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dealerEnabled: e.target.checked,
                      }))
                    }
                  />
                  Dealer-login actief
                </label>

                {message && <p className="crm-form-error">{message}</p>}

                <button
                  className="crm-btn crm-btn-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Bezig…" : "Koper toevoegen"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
