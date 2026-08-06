"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/mappers";
import type { TaxatieInput, TaxatieResult } from "@/lib/taxatie";
import { normalizeListingUrl } from "@/lib/taxatie";
import { formatEuro } from "@/lib/status";

const EMPTY = "-----";

const LAGER_BOD_TIPS = [
  {
    titel: "Online prijzen zijn vraagprijzen",
    zin: "De advertenties die u online ziet zijn dealer- of vraagprijzen, vaak mét marge en soms garantie. Wij kopen in zonder dat.",
  },
  {
    titel: "Technisch risico bij ons",
    zin: "Wij nemen het technische risico over en moeten de machine nog controleren voordat we doorverkopen.",
  },
  {
    titel: "Transport & ophalen",
    zin: "Er komen nog kosten bij voor ophalen, keuren en eventueel rijklaar maken.",
  },
  {
    titel: "Geen recente keuring / historie",
    zin: "Zonder recente keuring of onderhoudsboek kunnen we geen hogere handelswaarde aanhouden.",
  },
  {
    titel: "Banden / mast / lekkage",
    zin: "Als banden, mast of cilinders slijtage of lekkage tonen, moeten we daarop aftrekken.",
  },
  {
    titel: "Accu (elektrisch)",
    zin: "Bij elektrische trucks: als de accucapaciteit niet is getest, houden we een risicoreserve aan.",
  },
  {
    titel: "Uren / leeftijd niet verifieerbaar",
    zin: "Bij deze leeftijd is de urenteller niet altijd volledig te verifiëren; dat verlaagt wat we veilig kunnen bieden.",
  },
  {
    titel: "Snelle deal, cash / snel afhalen",
    zin: "Wij kunnen snel overnemen, maar daar hoort een realistische handelsinkoopprijs bij — geen eindgebruikersprijs.",
  },
] as const;

type SimpleForm = {
  merk: string;
  model: string;
  draaiuren: string;
  bouwjaar: string;
  omschrijving: string;
};

type FieldKey = keyof SimpleForm;

/** Haal bouwjaar, uren, capaciteit e.d. uit vrije tekst. */
export function parseSpecsFromText(text: string): Partial<{
  bouwjaar: string;
  draaiuren: string;
  capaciteitKg: string;
  hefhoogteMm: string;
  aandrijving: string;
}> {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t === EMPTY) return {};

  const out: Partial<{
    bouwjaar: string;
    draaiuren: string;
    capaciteitKg: string;
    hefhoogteMm: string;
    aandrijving: string;
  }> = {};

  const year =
    t.match(
      /\b(?:bouwjaar|bj\.?|jaar)\s*[:=]?\s*(19[8-9]\d|20[0-2]\d)\b/i,
    )?.[1] ||
    t.match(/\b(19[8-9]\d|20[0-2]\d)\b/)?.[1];
  if (year) out.bouwjaar = year;

  const hours =
    t.match(
      /\b(\d{1,3}(?:[.\s]\d{3})*|\d{3,6})\s*(?:uren?|uur|draaiuren|bedrijfsuren|hours?)\b/i,
    )?.[1] ||
    t.match(
      /\b(?:uren?|uur|draaiuren|bedrijfsuren)\s*[:=]?\s*(\d{1,3}(?:[.\s]\d{3})*|\d{3,6})\b/i,
    )?.[1];
  if (hours) out.draaiuren = hours.replace(/[.\s]/g, "");

  const cap =
    t.match(/\b(\d(?:[.,]\d)?|\d{3,5})\s*(?:ton|t)\b/i) ||
    t.match(/\b(\d{3,5})\s*kg\b/i) ||
    t.match(
      /\b(?:capaciteit|hefvermogen)\s*[:=]?\s*(\d(?:[.,]\d)?|\d{3,5})\s*(?:ton|t|kg)?\b/i,
    );
  if (cap) {
    const raw = cap[1].replace(",", ".");
    const n = Number(raw);
    if (Number.isFinite(n)) {
      out.capaciteitKg = String(n < 50 ? Math.round(n * 1000) : Math.round(n));
    }
  }

  const lift =
    t.match(/\b(\d(?:[.,]\d)?)\s*m(?:eter)?\b/i) ||
    t.match(/\b(\d{3,5})\s*mm\b/i) ||
    t.match(
      /\b(?:hefhoogte|masthoogte)\s*[:=]?\s*(\d(?:[.,]\d)?|\d{3,5})\s*(?:m|mm)?\b/i,
    );
  if (lift) {
    const raw = lift[1].replace(",", ".");
    const n = Number(raw);
    if (Number.isFinite(n)) {
      out.hefhoogteMm = String(n < 20 ? Math.round(n * 1000) : Math.round(n));
    }
  }

  if (/\b(elektr|elektro|accu|battery)\b/i.test(t)) out.aandrijving = "elektrisch";
  else if (/\blpg\b|\bgas\b/i.test(t)) out.aandrijving = "LPG";
  else if (/\bdiesel\b/i.test(t)) out.aandrijving = "diesel";

  return out;
}

function clean(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  if (!t || t === EMPTY || t === "Onbekend") return "";
  return t;
}

function display(v: string): string {
  return clean(v) || EMPTY;
}

function formFromLead(lead: Lead): SimpleForm {
  const omschrijving = clean(lead.omschrijving);
  const parsed = parseSpecsFromText(omschrijving);
  return {
    merk: clean(lead.merk),
    model: clean(lead.model),
    draaiuren: parsed.draaiuren ?? "",
    bouwjaar: parsed.bouwjaar ?? "",
    omschrijving,
  };
}

function toApiInput(
  form: SimpleForm,
  lead: Lead,
  photo?: { id: string; url: string } | null,
): TaxatieInput {
  const omschrijving = clean(form.omschrijving);
  const parsed = parseSpecsFromText(
    [omschrijving, clean(form.bouwjaar), clean(form.draaiuren)]
      .filter(Boolean)
      .join("\n"),
  );
  return {
    merk: clean(form.merk),
    model: clean(form.model),
    bouwjaar: clean(form.bouwjaar) || parsed.bouwjaar || "",
    draaiuren: clean(form.draaiuren) || parsed.draaiuren || "",
    aandrijving: parsed.aandrijving || "",
    capaciteitKg: parsed.capaciteitKg || "",
    hefhoogteMm: parsed.hefhoogteMm || "",
    mast: "",
    uitvoering: "",
    banden: "",
    accuInfo: "",
    locatie: "",
    verkoperRichtprijs:
      lead.richtprijs != null ? String(Math.round(lead.richtprijs)) : "",
    bekendeGebreken: "",
    extraNotities: lead.timing ? `Timing verkoper: ${lead.timing}` : "",
    omschrijving,
    photoId: photo?.id,
    photoUrl: photo?.url,
  };
}

function applyOmschrijvingParse(
  prev: SimpleForm,
  omschrijvingRaw: string,
): SimpleForm {
  const omschrijving = clean(omschrijvingRaw);
  const parsed = parseSpecsFromText(omschrijving);
  return {
    ...prev,
    omschrijving,
    bouwjaar: clean(prev.bouwjaar) || parsed.bouwjaar || "",
    draaiuren: clean(prev.draaiuren) || parsed.draaiuren || "",
  };
}

function FieldRow({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const shown = display(value);

  function handleFocus(
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (!clean(value)) {
      e.target.select();
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const next = e.target.value;
    onChange(next === EMPTY ? "" : next);
  }

  function handleBlur() {
    if (!clean(value)) onChange("");
  }

  return (
    <label className="call-taxatie-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          className="crm-input"
          rows={4}
          value={shown}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      ) : (
        <input
          className="crm-input"
          value={shown}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      )}
    </label>
  );
}

export function CallTaxatiePanel({ lead }: { lead: Lead }) {
  const [form, setForm] = useState<SimpleForm>(() => formFromLead(lead));
  const [busy, setBusy] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<TaxatieResult | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [selectPhoto, setSelectPhoto] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const photos = lead.photos ?? [];
  const selectedPhoto =
    photos.find((p) => p.id === selectedPhotoId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setForm(formFromLead(lead));
    setResult(null);
    setError("");
    setWarning("");
    setSavedAt(null);
    setTipsOpen(false);
    setSelectPhoto(false);
    setSelectedPhotoId(null);
    setLoadingSaved(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/taxatie?leadId=${encodeURIComponent(lead.id)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Ophalen mislukt");
        const saved = data.taxatie as {
          result: TaxatieResult;
          input?: Partial<TaxatieInput> & {
            photoId?: string;
            photoUrl?: string;
          };
          createdAt: string;
        } | null;
        if (saved?.result) {
          setResult(saved.result);
          setSavedAt(saved.createdAt);
          if (saved.input) {
            setForm((prev) => ({
              ...prev,
              merk: clean(String(saved.input?.merk ?? "")) || prev.merk,
              model: clean(String(saved.input?.model ?? "")) || prev.model,
              draaiuren:
                clean(String(saved.input?.draaiuren ?? "")) || prev.draaiuren,
              bouwjaar:
                clean(String(saved.input?.bouwjaar ?? "")) || prev.bouwjaar,
              omschrijving:
                clean(String(saved.input?.omschrijving ?? "")) ||
                prev.omschrijving,
            }));
            const pid = clean(String(saved.input.photoId ?? ""));
            if (pid && (lead.photos ?? []).some((p) => p.id === pid)) {
              setSelectPhoto(true);
              setSelectedPhotoId(pid);
            }
          }
        }
      } catch {
        // Geen opgeslagen taxatie of tabel nog niet gemigreerd — stil negeren
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  function setField(key: FieldKey, value: string) {
    if (key === "omschrijving") {
      setForm((f) => applyOmschrijvingParse(f, value));
      return;
    }
    setForm((f) => ({ ...f, [key]: clean(value) === "" ? "" : value }));
  }

  async function runTaxatie(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setWarning("");
    setResult(null);
    try {
      const photo =
        selectPhoto && selectedPhoto
          ? { id: selectedPhoto.id, url: selectedPhoto.url }
          : null;
      const res = await fetch("/api/admin/taxatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toApiInput(form, lead, photo),
          leadId: lead.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Taxatie mislukt");
      setResult(data.taxatie as TaxatieResult);
      setSavedAt(new Date().toISOString());
      if (data.warning) setWarning(String(data.warning));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Taxatie mislukt");
    } finally {
      setBusy(false);
    }
  }

  const canStart = Boolean(
    clean(form.merk) || clean(form.model) || (selectPhoto && selectedPhoto),
  );
  const p = result?.prijsadvies;
  const verkoopMin = p
    ? p.verwachte_verkoopprijs_min || p.verwachte_verkoopprijs
    : 0;
  const verkoopMax = p
    ? p.verwachte_verkoopprijs_max || p.verwachte_verkoopprijs
    : 0;
  const inkoopMin = p
    ? Math.min(p.openingsbod, p.aanbevolen_inkoopprijs)
    : 0;
  const inkoopMax = p ? p.maximum_inkoopprijs || p.aanbevolen_inkoopprijs : 0;
  const conservatief = p
    ? Math.round(Math.min(inkoopMin, p.aanbevolen_inkoopprijs) * 0.75)
    : 0;

  return (
    <div className="call-card call-taxatie">
      <header className="call-taxatie-head">
        <h3>Taxatie-assistent</h3>
      </header>

      <div className="call-taxatie-layout">
        <form className="call-taxatie-form" onSubmit={runTaxatie}>
          <FieldRow
            label="Merk"
            value={form.merk}
            onChange={(v) => setField("merk", v)}
          />
          <FieldRow
            label="Model"
            value={form.model}
            onChange={(v) => setField("model", v)}
          />
          <FieldRow
            label="Draaiuren"
            value={form.draaiuren}
            onChange={(v) => setField("draaiuren", v)}
          />
          <FieldRow
            label="Bouwjaar"
            value={form.bouwjaar}
            onChange={(v) => setField("bouwjaar", v)}
          />
          <FieldRow
            label="Omschrijving"
            value={form.omschrijving}
            onChange={(v) => setField("omschrijving", v)}
            multiline
          />

          <div className="call-taxatie-photo-block">
            <label className="call-taxatie-check">
              <input
                type="checkbox"
                checked={selectPhoto}
                disabled={photos.length === 0}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSelectPhoto(on);
                  if (!on) setSelectedPhotoId(null);
                  else if (!selectedPhotoId && photos[0]) {
                    setSelectedPhotoId(photos[0].id);
                  }
                }}
              />
              <span>Selecteer foto</span>
            </label>
            {photos.length === 0 ? (
              <p className="crm-muted call-taxatie-photo-hint">
                Geen foto&apos;s bij deze lead.
              </p>
            ) : null}
            {selectPhoto && photos.length > 0 ? (
              <div className="call-taxatie-photo-grid" role="listbox" aria-label="Kies foto">
                {photos.map((p) => {
                  const active = p.id === selectedPhotoId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={
                        active
                          ? "call-taxatie-photo-thumb is-selected"
                          : "call-taxatie-photo-thumb"
                      }
                      onClick={() => setSelectedPhotoId(p.id)}
                      title={p.originalName || "Foto"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.originalName || "Leadfoto"} />
                    </button>
                  );
                })}
              </div>
            ) : null}
            {selectPhoto && selectedPhoto ? (
              <p className="crm-muted call-taxatie-photo-hint">
                Foto wordt meegestuurd (bijv. typeplaatje / serienummer).
              </p>
            ) : null}
          </div>

          <div className="call-taxatie-actions">
            <button
              type="submit"
              className="crm-btn crm-btn-primary call-taxatie-submit"
              disabled={busy || !canStart}
            >
              {busy ? (
                <>
                  <span className="call-taxatie-spinner" aria-hidden />
                  Bezig met taxatie…
                </>
              ) : (
                "Taxatie starten"
              )}
            </button>
          </div>
          {error ? <p className="call-taxatie-error">{error}</p> : null}
          {warning ? <p className="call-taxatie-warn-inline">{warning}</p> : null}
          {savedAt && !busy && result ? (
            <p className="crm-muted call-taxatie-saved">
              Opgeslagen{" "}
              {new Date(savedAt).toLocaleString("nl-NL", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </form>

        <div className="call-taxatie-result-card">
          {loadingSaved ? (
            <p className="crm-muted call-taxatie-placeholder">
              Opgeslagen taxatie laden…
            </p>
          ) : null}

          {busy ? (
            <div className="call-taxatie-loading">
              <span className="call-taxatie-spinner call-taxatie-spinner--lg" />
              <p>Marktonderzoek bezig…</p>
            </div>
          ) : null}

          {!result && !busy && !loadingSaved ? (
            <p className="crm-muted call-taxatie-empty-result">{EMPTY}</p>
          ) : null}

          {result && p && !busy ? (
            <>
              <div className="call-taxatie-result-top">
                <div className="call-taxatie-price-rows">
                  <div>
                    <span>Verkoopprijs geschat</span>
                    <strong>
                      {formatEuro(verkoopMin)} – {formatEuro(verkoopMax)}
                    </strong>
                  </div>
                  <div>
                    <span className="call-taxatie-label-with-i">
                      Inkoopprijs
                      <button
                        type="button"
                        className="call-taxatie-i"
                        aria-expanded={tipsOpen}
                        aria-label="Tips voor lager bod"
                        title="Veelvoorkomende argumenten voor een lager bod"
                        onClick={() => setTipsOpen((o) => !o)}
                      >
                        i
                      </button>
                    </span>
                    <strong>
                      {formatEuro(inkoopMin)} – {formatEuro(inkoopMax)}
                    </strong>
                  </div>
                  <div>
                    <span>Conservatieve prijs</span>
                    <strong>{formatEuro(conservatief)}</strong>
                    <em className="crm-muted">
                      Laagste verwachte inkoop − 25%
                    </em>
                  </div>
                </div>
              </div>

              {tipsOpen ? (
                <div className="call-taxatie-tips">
                  <h4>Lager bieden — veelvoorkomende argumenten</h4>
                  <ul>
                    {(result.redenen_voor_lager_bod?.length
                      ? result.redenen_voor_lager_bod.map((r) => ({
                          titel: r.reden,
                          zin: r.zin_voor_tijdens_het_gesprek,
                        }))
                      : LAGER_BOD_TIPS
                    ).map((tip, i) => (
                      <li key={i}>
                        <strong>{tip.titel}</strong>
                        <p>“{tip.zin}”</p>
                      </li>
                    ))}
                  </ul>
                  {result.redenen_voor_lager_bod?.length ? null : (
                    <p className="crm-muted call-taxatie-tips-note">
                      Gebruik alleen wat klopt voor deze machine.
                    </p>
                  )}
                  {result.redenen_voor_lager_bod?.length ? (
                    <details className="call-taxatie-tips-extra">
                      <summary>Extra standaardargumenten</summary>
                      <ul>
                        {LAGER_BOD_TIPS.map((tip, i) => (
                          <li key={i}>
                            <strong>{tip.titel}</strong>
                            <p>“{tip.zin}”</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {result.vergelijkbare_machines.length > 0 ? (
                <div className="call-taxatie-comps">
                  <h4>Vergelijkbaar</h4>
                  <ul>
                    {result.vergelijkbare_machines.map((m, i) => {
                      const href = normalizeListingUrl(m.url);
                      const label =
                        m.titel ||
                        `${m.merk} ${m.model}`.trim() ||
                        href ||
                        "Vergelijking";
                      return (
                        <li key={i}>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="call-taxatie-comp-link"
                            >
                              {label}
                              <span className="call-taxatie-comp-open">
                                {" "}
                                ↗
                              </span>
                            </a>
                          ) : (
                            <span>{label}</span>
                          )}
                          {m.vraagprijs != null ? (
                            <span className="crm-muted">
                              {" "}
                              · {formatEuro(m.vraagprijs)}
                            </span>
                          ) : null}
                          {!href ? (
                            <span className="crm-muted">
                              {" "}
                              · geen advertentielink
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="crm-muted" style={{ marginBottom: 0 }}>
                  Geen vergelijkbare advertenties gevonden.
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
