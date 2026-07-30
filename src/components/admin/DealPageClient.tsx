"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FinanceCalcFields,
  useFinanceCalc,
} from "@/components/admin/FinanceCalcFields";
import type { Buyer, Lead } from "@/lib/mappers";
import { SALES_REPS } from "@/lib/constants";
import { formatEuroK } from "@/lib/status";

type CompanyInfo = {
  name: string;
  legalName: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  kvk: string;
  btw: string;
  email: string;
  phone: string;
  website: string;
};

export function DealPageClient({
  initialLead,
  buyers,
  company,
}: {
  initialLead: Lead;
  buyers: Buyer[];
  company: CompanyInfo;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const isExistingDeal = lead.status === "deal";
  const [editing, setEditing] = useState(!isExistingDeal);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [naam, setNaam] = useState(lead.naam);
  const [bedrijfsnaam, setBedrijfsnaam] = useState(lead.bedrijfsnaam ?? "");
  const [verkoopmedewerker, setVerkoopmedewerker] = useState(
    lead.verkoopmedewerker ?? "",
  );
  const [email, setEmail] = useState(lead.email);
  const [telefoon, setTelefoon] = useState(lead.telefoon);
  const [straat, setStraat] = useState(lead.straat ?? "");
  const [huisnummer, setHuisnummer] = useState(lead.huisnummer ?? "");
  const [toevoeging, setToevoeging] = useState(lead.toevoeging ?? "");
  const [postcode, setPostcode] = useState(lead.postcode ?? "");
  const [woonplaats, setWoonplaats] = useState(lead.woonplaats ?? "");

  const [merk, setMerk] = useState(lead.merk);
  const [model, setModel] = useState(lead.model ?? "");
  const [timing, setTiming] = useState(lead.timing);
  const [verkoopprijs, setVerkoopprijs] = useState(
    lead.verkoopprijs?.toString() ?? "",
  );
  const [dealDatum, setDealDatum] = useState(
    lead.dealDatum ?? new Date().toISOString().slice(0, 10),
  );

  const [buyerId, setBuyerId] = useState(lead.buyerId ?? "");
  const selectedBuyer = useMemo(
    () => buyers.find((b) => b.id === buyerId) ?? null,
    [buyers, buyerId],
  );

  const finance = useFinanceCalc({
    inkoopprijs: lead.inkoopprijs,
    marge: lead.marge,
    nettoInkoopprijs: lead.nettoInkoopprijs,
  });

  async function lookupPostcode() {
    if (!postcode.trim() || !huisnummer.trim()) {
      setMessage("Vul postcode en huisnummer in voor de lookup.");
      return;
    }
    setLookupBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/postcode?postcode=${encodeURIComponent(postcode)}&number=${encodeURIComponent(huisnummer)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup mislukt");
      setStraat(data.street || "");
      setWoonplaats(data.city || "");
      if (data.zip_code) setPostcode(data.zip_code);
      if (data.house_number) setHuisnummer(String(data.house_number));
      setMessage("Adres opgehaald via postcode API.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lookup mislukt");
    } finally {
      setLookupBusy(false);
    }
  }

  async function saveDeal(andGenerate: boolean) {
    if (!buyerId) {
      setMessage("Selecteer eerst een handelaar (koper).");
      return;
    }
    if (!postcode || !huisnummer || !straat || !woonplaats) {
      setMessage("Adres is verplicht (gebruik de postcode-lookup).");
      return;
    }
    if (!finance.bruto) {
      setMessage("Inkoopprijs is verplicht voor het contract.");
      return;
    }

    const fin = finance.valuesForSave();

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam,
          bedrijfsnaam: bedrijfsnaam.trim() || null,
          verkoopmedewerker: verkoopmedewerker.trim() || null,
          email,
          telefoon,
          straat,
          huisnummer,
          toevoeging: toevoeging || null,
          postcode,
          woonplaats,
          merk,
          model: model || null,
          timing,
          verkoopprijs: verkoopprijs === "" ? null : Number(verkoopprijs),
          dealDatum,
          buyerId,
          inkoopprijs: fin.inkoopprijs,
          marge: fin.marge ?? 0,
          nettoInkoopprijs: fin.nettoInkoopprijs,
          status: "deal",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setLead(data);
      finance.syncFromLead(data);
      setBedrijfsnaam(data.bedrijfsnaam ?? "");
      setVerkoopmedewerker(data.verkoopmedewerker ?? "");
      setMessage("Deal opgeslagen.");

      if (andGenerate) {
        const pdfRes = await fetch("/api/admin/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id, buyerId }),
        });
        if (!pdfRes.ok) {
          const err = await pdfRes.json();
          throw new Error(err.error || "Contract genereren mislukt");
        }
        const blob = await pdfRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contract-${lead.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        const emailedTo = pdfRes.headers.get("X-Email-To");
        setMessage(
          isExistingDeal
            ? `Deal opgeslagen en contract verstuurd${emailedTo ? ` naar ${emailedTo}` : ""} (PDF gedownload).`
            : `Deal opgeslagen, contract verstuurd${emailedTo ? ` naar ${emailedTo}` : ""}. PDF gedownload; draft-factuur aangemaakt.`,
        );
        setEditing(false);
      }

      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  const showForm = editing || !isExistingDeal;

  return (
    <>
      <div className="crm-page-header">
        <div>
          <p className="crm-subtitle">
            <Link href={`/admin/leads/${lead.id}`}>Lead</Link> /{" "}
            {isExistingDeal ? "Deal" : "Deal aanmaken"}
          </p>
          <h1 className="crm-title">Deal — {naam}</h1>
        </div>
        <div className="crm-actions" style={{ margin: 0 }}>
          <Link href={`/admin/leads/${lead.id}`} className="crm-btn">
            Terug naar lead
          </Link>
          {isExistingDeal && editing && (
            <button
              type="button"
              className="crm-btn"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Annuleren
            </button>
          )}
          {isExistingDeal ? (
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy}
              onClick={() => saveDeal(true)}
            >
              Opslaan & opnieuw verzenden
            </button>
          ) : (
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy}
              onClick={() => saveDeal(true)}
            >
              Maak & verstuur contract
            </button>
          )}
        </div>
      </div>

      {message && <div className="crm-toast">{message}</div>}

      {isExistingDeal && !editing && (
        <div className="crm-card" style={{ marginBottom: "1rem" }}>
          <div className="crm-card-head">Deal</div>
          <div
            className="crm-table-wrap"
            style={{ border: "none", boxShadow: "none" }}
          >
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Koper</th>
                  <th>Datum</th>
                  <th>Inkoopprijs</th>
                  <th>Marge</th>
                  <th>Netto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {merk} {model}
                  </td>
                  <td>{selectedBuyer?.bedrijf ?? "—"}</td>
                  <td>{dealDatum || "—"}</td>
                  <td>{formatEuroK(lead.inkoopprijs)}</td>
                  <td>{formatEuroK(lead.marge)}</td>
                  <td>{formatEuroK(lead.nettoInkoopprijs)}</td>
                  <td>
                    <button
                      type="button"
                      className="crm-icon-btn"
                      title="Deal bewerken"
                      aria-label="Deal bewerken"
                      onClick={() => setEditing(true)}
                    >
                      ✎
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="crm-two">
          <div>
            <div className="crm-card">
              <div className="crm-card-head">Verkoper (klant)</div>
              <div className="crm-card-body">
                <div className="crm-form">
                  <label>
                    Naam
                    <input
                      className="crm-input"
                      value={naam}
                      onChange={(e) => setNaam(e.target.value)}
                    />
                  </label>
                  <label>
                    Bedrijfsnaam (optioneel)
                    <input
                      className="crm-input"
                      value={bedrijfsnaam}
                      onChange={(e) => setBedrijfsnaam(e.target.value)}
                      placeholder="Voor op het contract"
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      className="crm-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Telefoon
                    <input
                      className="crm-input"
                      value={telefoon}
                      onChange={(e) => setTelefoon(e.target.value)}
                    />
                  </label>
                  <div className="crm-form-row">
                    <label>
                      Postcode
                      <input
                        className="crm-input"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                      />
                    </label>
                    <label>
                      Huisnr
                      <input
                        className="crm-input"
                        value={huisnummer}
                        onChange={(e) => setHuisnummer(e.target.value)}
                      />
                    </label>
                    <label>
                      Toev.
                      <input
                        className="crm-input"
                        value={toevoeging}
                        onChange={(e) => setToevoeging(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="crm-btn crm-btn-primary"
                      disabled={lookupBusy}
                      onClick={lookupPostcode}
                      title="Adres ophalen"
                    >
                      📍
                    </button>
                  </div>
                  <label>
                    Straat
                    <input
                      className="crm-input"
                      value={straat}
                      onChange={(e) => setStraat(e.target.value)}
                    />
                  </label>
                  <label>
                    Woonplaats
                    <input
                      className="crm-input"
                      value={woonplaats}
                      onChange={(e) => setWoonplaats(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="crm-card">
              <div className="crm-card-head">Voertuig</div>
              <div className="crm-card-body">
                <div className="crm-form">
                  <label>
                    Merk
                    <input
                      className="crm-input"
                      value={merk}
                      onChange={(e) => setMerk(e.target.value)}
                    />
                  </label>
                  <label>
                    Model
                    <input
                      className="crm-input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </label>
                  <label>
                    Timing / toelichting
                    <input
                      className="crm-input"
                      value={timing}
                      onChange={(e) => setTiming(e.target.value)}
                    />
                  </label>
                  <label>
                    Verkoopprijs-indicatie (optioneel)
                    <input
                      className="crm-input"
                      type="number"
                      min={0}
                      step="1"
                      value={verkoopprijs}
                      onChange={(e) => setVerkoopprijs(e.target.value)}
                    />
                  </label>
                  <label>
                    Dealdatum
                    <input
                      className="crm-input"
                      type="date"
                      value={dealDatum}
                      onChange={(e) => setDealDatum(e.target.value)}
                    />
                  </label>
                  <label>
                    Verkoopmedewerker
                    <select
                      className="crm-select"
                      value={verkoopmedewerker}
                      onChange={(e) => setVerkoopmedewerker(e.target.value)}
                    >
                      <option value="">— Kies medewerker —</option>
                      {SALES_REPS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      {verkoopmedewerker &&
                        !(SALES_REPS as readonly string[]).includes(
                          verkoopmedewerker,
                        ) && (
                          <option value={verkoopmedewerker}>
                            {verkoopmedewerker}
                          </option>
                        )}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="crm-card">
              <div className="crm-card-head">Koper (handelaar)</div>
              <div className="crm-card-body">
                <div className="crm-form">
                  <label>
                    Selecteer handelaar
                    <select
                      className="crm-select"
                      value={buyerId}
                      onChange={(e) => setBuyerId(e.target.value)}
                    >
                      <option value="">— Kies handelaar —</option>
                      {buyers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bedrijf} ({b.naam})
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedBuyer ? (
                    <div className="crm-fields">
                      <div className="crm-field">
                        <label>Bedrijf</label>
                        <div>{selectedBuyer.bedrijf}</div>
                      </div>
                      <div className="crm-field">
                        <label>Contact</label>
                        <div>{selectedBuyer.naam}</div>
                      </div>
                      <div className="crm-field">
                        <label>E-mail</label>
                        <div>{selectedBuyer.email ?? "—"}</div>
                      </div>
                      <div className="crm-field">
                        <label>Telefoon</label>
                        <div>{selectedBuyer.telefoon ?? "—"}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="crm-muted">
                      Nog geen handelaar gekozen.{" "}
                      <Link href="/admin/kopers">Beheer handelaren</Link>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="crm-card">
              <div className="crm-card-head">Bemiddelaar (wij)</div>
              <div className="crm-card-body">
                <div className="crm-fields">
                  <div className="crm-field">
                    <label>Bedrijf</label>
                    <div>{company.legalName}</div>
                  </div>
                  <div className="crm-field">
                    <label>Adres</label>
                    <div>
                      {company.street} {company.houseNumber}
                      <br />
                      {company.postcode} {company.city}
                    </div>
                  </div>
                  <div className="crm-field">
                    <label>KvK / BTW</label>
                    <div>
                      {company.kvk} / {company.btw}
                    </div>
                  </div>
                  <div className="crm-field">
                    <label>Contact</label>
                    <div>
                      {company.email}
                      <br />
                      {company.phone}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="crm-card">
              <div className="crm-card-head">Financieel</div>
              <div className="crm-card-body">
                <FinanceCalcFields finance={finance} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
