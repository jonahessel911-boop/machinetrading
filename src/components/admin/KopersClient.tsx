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
  dealerActivatedAt: string | null;
  dailyDigest?: boolean;
};

const emptyForm = {
  naam: "",
  bedrijf: "",
  email: "",
  telefoon: "",
  dealerPassword: "",
  dealerEnabled: false,
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
        dealerActivatedAt: b.dealerActivatedAt,
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
      if (data.inviteSent) {
        setMessage("Handelaar aangemaakt — inlogmail verstuurd.");
      } else if (data.inviteError) {
        setMessage(
          `Handelaar aangemaakt, maar mail mislukt: ${data.inviteError}`,
        );
      } else {
        setMessage(
          "Handelaar geregistreerd (zonder login). Je kunt later een account toevoegen.",
        );
      }
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
          Nieuwe handelaar
        </button>
      </div>

      <div className="crm-card">
        <div className="crm-card-head">
          Handelaren · {rows.length} · periode-filter actief
        </div>
        {message && !open ? (
          <p className="crm-muted" style={{ padding: "0.75rem 1rem 0" }}>
            {message}
          </p>
        ) : null}
        <div
          className="crm-table-wrap"
          style={{ border: "none", boxShadow: "none" }}
        >
          <table className="crm-table">
            <thead>
              <tr>
                <th>Bedrijfsnaam</th>
                <th>Account</th>
                <th>Deals</th>
                <th>Bem. Vol</th>
                <th>Omzet</th>
                <th>Winst</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const buyer = buyers.find((b) => b.id === r.buyerId);
                const hasLogin = Boolean(
                  buyer?.hasDealerPassword || buyer?.dealerUsername,
                );
                const activated = Boolean(buyer?.dealerActivatedAt);
                return (
                  <ClickableRow
                    key={r.buyerId}
                    href={`/admin/kopers/${r.buyerId}`}
                  >
                    <td>
                      <strong>{r.bedrijf}</strong>
                      <div className="crm-muted">{r.naam}</div>
                    </td>
                    <td>
                      {!hasLogin ? (
                        <span className="crm-muted">Geen login</span>
                      ) : activated ? (
                        <span className="crm-account-status crm-account-status--ok">
                          <span aria-hidden="true">✓</span> Geactiveerd
                        </span>
                      ) : (
                        <span className="crm-account-status crm-account-status--pending">
                          <span aria-hidden="true">✕</span> Niet geactiveerd
                        </span>
                      )}
                      {buyer?.dailyDigest ? (
                        <div className="crm-muted" style={{ marginTop: "0.25rem" }}>
                          Aanbod van de dag
                        </div>
                      ) : null}
                    </td>
                    <td>{r.deals}</td>
                    <td>{formatEuroK(r.waardeDeals)}</td>
                    <td>{formatEuroK(r.omzet)}</td>
                    <td>{formatEuro(r.winst)}</td>
                  </ClickableRow>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>Nog geen kopers.</td>
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
              <h2>Handelaar registreren</h2>
              <button type="button" className="crm-btn" onClick={closeModal}>
                Sluiten
              </button>
            </div>
            <div className="crm-modal-body">
              <form className="crm-form" onSubmit={createBuyer}>
                <p className="crm-muted" style={{ marginTop: 0 }}>
                  Registreer een bedrijf dat je hebt gebeld — standaard zonder
                  marketplace-login. Zo houd je bij wie je hebt benaderd.
                </p>
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
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="Optioneel — verplicht bij login"
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
                    placeholder="Nummer waarop je belt"
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
                  Marketplace-login (optioneel) — leeg laten = alleen
                  registratie, geen account
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
                        dealerEnabled: e.target.value
                          ? true
                          : f.dealerEnabled,
                      }))
                    }
                    autoComplete="new-password"
                    placeholder="Leeg = geen login"
                  />
                </label>
                {form.dealerPassword ? (
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
                    Dealer-login actief + uitnodiging mailen
                  </label>
                ) : null}

                {message && <p className="crm-form-error">{message}</p>}

                <button
                  className="crm-btn crm-btn-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Bezig…"
                    : form.dealerPassword
                      ? "Handelaar + login aanmaken"
                      : "Registreren zonder login"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
