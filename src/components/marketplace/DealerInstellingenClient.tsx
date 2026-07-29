"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceSettings } from "@/lib/invoices";

const empty: InvoiceSettings = {
  invoiceBedrijf: "",
  invoiceContact: "",
  invoiceEmail: "",
  invoiceTelefoon: "",
  invoiceStraat: "",
  invoiceHuisnummer: "",
  invoicePostcode: "",
  invoiceWoonplaats: "",
  invoiceLand: "Nederland",
  invoiceKvk: "",
  invoiceBtw: "",
  invoiceIban: "",
  invoiceBic: "",
};

export function DealerInstellingenClient({
  initial,
}: {
  initial: InvoiceSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InvoiceSettings>({
    ...empty,
    ...Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, v ?? ""]),
    ),
  } as InvoiceSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function setField<K extends keyof InvoiceSettings>(
    key: K,
    value: InvoiceSettings[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/dealer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setForm({
        ...empty,
        ...Object.fromEntries(
          Object.entries(data as InvoiceSettings).map(([k, v]) => [
            k,
            v ?? "",
          ]),
        ),
      } as InvoiceSettings);
      setMessage("Factuurgegevens opgeslagen.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-card">
      <div className="crm-card-head">Factuurgegevens</div>
      <div className="crm-card-body">
        <p className="crm-muted">
          Deze gegevens gebruiken we voor facturatie richting jouw bedrijf.
        </p>
        <form className="crm-form dealer-settings-form" onSubmit={onSubmit}>
          <div className="dealer-settings-grid">
            <label>
              Bedrijfsnaam
              <input
                className="crm-input"
                value={form.invoiceBedrijf ?? ""}
                onChange={(e) => setField("invoiceBedrijf", e.target.value)}
              />
            </label>
            <label>
              Contactpersoon
              <input
                className="crm-input"
                value={form.invoiceContact ?? ""}
                onChange={(e) => setField("invoiceContact", e.target.value)}
              />
            </label>
            <label>
              Factuur e-mail
              <input
                className="crm-input"
                type="email"
                value={form.invoiceEmail ?? ""}
                onChange={(e) => setField("invoiceEmail", e.target.value)}
              />
            </label>
            <label>
              Telefoon
              <input
                className="crm-input"
                value={form.invoiceTelefoon ?? ""}
                onChange={(e) => setField("invoiceTelefoon", e.target.value)}
              />
            </label>
            <label>
              Straat
              <input
                className="crm-input"
                value={form.invoiceStraat ?? ""}
                onChange={(e) => setField("invoiceStraat", e.target.value)}
              />
            </label>
            <label>
              Huisnummer
              <input
                className="crm-input"
                value={form.invoiceHuisnummer ?? ""}
                onChange={(e) => setField("invoiceHuisnummer", e.target.value)}
              />
            </label>
            <label>
              Postcode
              <input
                className="crm-input"
                value={form.invoicePostcode ?? ""}
                onChange={(e) => setField("invoicePostcode", e.target.value)}
              />
            </label>
            <label>
              Woonplaats
              <input
                className="crm-input"
                value={form.invoiceWoonplaats ?? ""}
                onChange={(e) => setField("invoiceWoonplaats", e.target.value)}
              />
            </label>
            <label>
              Land
              <input
                className="crm-input"
                value={form.invoiceLand ?? ""}
                onChange={(e) => setField("invoiceLand", e.target.value)}
              />
            </label>
            <label>
              KvK-nummer
              <input
                className="crm-input"
                value={form.invoiceKvk ?? ""}
                onChange={(e) => setField("invoiceKvk", e.target.value)}
              />
            </label>
            <label>
              BTW-nummer
              <input
                className="crm-input"
                value={form.invoiceBtw ?? ""}
                onChange={(e) => setField("invoiceBtw", e.target.value)}
              />
            </label>
            <label>
              IBAN
              <input
                className="crm-input"
                value={form.invoiceIban ?? ""}
                onChange={(e) => setField("invoiceIban", e.target.value)}
              />
            </label>
            <label>
              BIC
              <input
                className="crm-input"
                value={form.invoiceBic ?? ""}
                onChange={(e) => setField("invoiceBic", e.target.value)}
              />
            </label>
          </div>
          <div className="dealer-settings-actions">
            <button
              type="submit"
              className="crm-btn crm-btn-primary"
              disabled={busy}
            >
              {busy ? "Bezig…" : "Opslaan"}
            </button>
          </div>
        </form>
        {message && (
          <p className="crm-toast" style={{ marginTop: "0.85rem" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
