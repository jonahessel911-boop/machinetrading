"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BRANDS, TIMING_OPTIONS } from "@/lib/constants";
import { vehicleLabel } from "@/lib/status";

type Step = "brand" | "model" | "timing" | "loading" | "contact" | "done";

const STEP_META: Record<
  Step,
  { index: number; total: number; header: string; showProgress: boolean }
> = {
  brand: {
    index: 1,
    total: 4,
    header: "Selecteer het merk van jouw heftruck",
    showProgress: true,
  },
  model: {
    index: 2,
    total: 4,
    header: "Welk model is jouw heftruck?",
    showProgress: true,
  },
  timing: {
    index: 3,
    total: 4,
    header: "Wanneer wilt u verkopen?",
    showProgress: true,
  },
  loading: {
    index: 3,
    total: 4,
    header: "Potentiële kopers zoeken....",
    showProgress: true,
  },
  contact: {
    index: 4,
    total: 4,
    header: "Laat je gegevens achter voor een vrijblijvend bod",
    showProgress: true,
  },
  done: {
    index: 4,
    total: 4,
    header: "Aanmelding ontvangen",
    showProgress: false,
  },
};

export function FormFunnel() {
  const [step, setStep] = useState<Step>("brand");
  const [merk, setMerk] = useState("");
  const [model, setModel] = useState("");
  const [timing, setTiming] = useState("");
  const [buyerCount] = useState(() => Math.floor(Math.random() * 7) + 4);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [woonplaats, setWoonplaats] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ url: string; id: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const label = useMemo(() => vehicleLabel(merk, model), [merk, model]);
  const meta = STEP_META[step];
  const barPct =
    step === "loading"
      ? 70
      : step === "done"
        ? 100
        : (meta.index / meta.total) * 100;

  useEffect(() => {
    if (step !== "loading") return;
    setProgress(0);
    const start = Date.now();
    const duration = 3000;
    let raf = 0;
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      else setStep("contact");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merk: merk || "Onbekend",
          model: model || "Onbekend",
          timing,
          naam,
          email,
          telefoon,
          woonplaats,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      setLeadId(data.id);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setSubmitting(false);
    }
  }

  const timingHeader =
    step === "timing"
      ? `Wanneer wilt u uw ${label} verkopen?`
      : meta.header;

  return (
    <div className="form-page">
      <div className="form-page-inner">
        <Link href="/" className="form-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-clean.png" alt="heftruckverkocht.nl" />
        </Link>

        <div className="form-banner">
          <div className="form-banner-avatar" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/advisor.jpg" alt="" />
          </div>
          <p>
            Wij onderhandelen met heftruckbedrijven in heel Nederland om de
            beste prijs voor jouw machine te krijgen — zonder dat jij er werk
            aan hebt.
          </p>
        </div>

        {meta.showProgress && (
          <div className="form-progress">
            <div className="form-progress-labels">
              <span>Gratis aanmelden</span>
              <span>
                Stap {meta.index} van {meta.total}
              </span>
            </div>
            <div className="form-progress-bar">
              <div style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}

        <div className="form-card">
          <div className="form-card-head">
            <h1>{timingHeader}</h1>
          </div>
          <div className="form-card-body">
            {step === "brand" && (
              <div className="form-step">
                <select
                  className="form-field"
                  value={merk === "Onbekend" ? "" : merk}
                  onChange={(e) => setMerk(e.target.value)}
                >
                  <option value="">Kies een merk…</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="form-ghost"
                  onClick={() => {
                    setMerk("Onbekend");
                    setStep("model");
                  }}
                >
                  Ik weet het niet / anders
                </button>
                <button
                  type="button"
                  className="form-next"
                  disabled={!merk}
                  onClick={() => setStep("model")}
                >
                  Volgende →
                </button>
              </div>
            )}

            {step === "model" && (
              <div className="form-step">
                <input
                  className="form-field"
                  placeholder="Model (bijv. RX60-35)"
                  value={model === "Onbekend" ? "" : model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <button
                  type="button"
                  className="form-ghost"
                  onClick={() => {
                    setModel("Onbekend");
                    setStep("timing");
                  }}
                >
                  Ik weet het niet
                </button>
                <button
                  type="button"
                  className="form-next"
                  disabled={!model || model === "Onbekend"}
                  onClick={() => setStep("timing")}
                >
                  Volgende →
                </button>
                <button
                  type="button"
                  className="form-back"
                  onClick={() => setStep("brand")}
                >
                  ← Terug
                </button>
              </div>
            )}

            {step === "timing" && (
              <div className="form-step">
                <div className="form-choices">
                  {TIMING_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="form-choice"
                      onClick={() => {
                        setTiming(opt);
                        setStep("loading");
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="form-back"
                  onClick={() => setStep("model")}
                >
                  ← Terug
                </button>
              </div>
            )}

            {step === "loading" && (
              <div className="form-step form-loading">
                <div
                  className="ring"
                  style={{
                    background: `conic-gradient(var(--orange) ${progress * 3.6}deg, #ececec 0deg)`,
                  }}
                >
                  <div className="ring-inner">{Math.round(progress)}%</div>
                </div>
                <p>Even geduld, we checken ons netwerk.</p>
              </div>
            )}

            {step === "contact" && (
              <div className="form-step">
                <p className="form-interest">
                  {buyerCount} heftruck bedrijven hebben mogelijk interesse!
                </p>
                <form className="form-fields" onSubmit={submitLead}>
                  <input
                    className="form-field"
                    required
                    placeholder="Naam"
                    value={naam}
                    onChange={(e) => setNaam(e.target.value)}
                  />
                  <input
                    className="form-field"
                    required
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="form-field"
                    required
                    type="tel"
                    placeholder="Telefoonnummer"
                    value={telefoon}
                    onChange={(e) => setTelefoon(e.target.value)}
                  />
                  <input
                    className="form-field"
                    required
                    placeholder="Woonplaats"
                    value={woonplaats}
                    onChange={(e) => setWoonplaats(e.target.value)}
                  />
                  {error && <p className="form-error">{error}</p>}
                  <button
                    type="submit"
                    className="form-next"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Bezig…"
                      : "Meld mijn heftruck vrijblijvend aan"}
                  </button>
                </form>
              </div>
            )}

            {step === "done" && (
              <div className="form-step form-done">
                <p className="form-done-lead">
                  We nemen zo snel mogelijk contact met je op. Om sneller de
                  beste prijs voor je{" "}
                  <strong>{label === "heftruck" ? "heftruck" : label}</strong> te
                  krijgen kun je alvast foto&apos;s uploaden.
                </p>
                <p className="form-done-stat">
                  De mensen die foto&apos;s uploaden verkopen hun heftruck
                  gemiddeld voor 29% meer en 4 uur sneller
                </p>

                {leadId && (
                  <div className="photo-upload">
                    <label className="photo-drop">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files?.length || !leadId) return;
                          setUploading(true);
                          setUploadMsg("");
                          try {
                            const body = new FormData();
                            Array.from(files).forEach((f) =>
                              body.append("photos", f),
                            );
                            const res = await fetch(
                              `/api/leads/${leadId}/photos`,
                              { method: "POST", body },
                            );
                            const data = await res.json();
                            if (!res.ok) {
                              throw new Error(data.error || "Upload mislukt");
                            }
                            const added = (
                              data.photos as { id: string; url: string }[]
                            ).map((p) => ({ id: p.id, url: p.url }));
                            setPhotos((prev) => {
                              const ids = new Set(prev.map((p) => p.id));
                              return [
                                ...prev,
                                ...added.filter((p) => !ids.has(p.id)),
                              ];
                            });
                          } catch (err) {
                            setUploadMsg(
                              err instanceof Error
                                ? err.message
                                : "Upload mislukt",
                            );
                          } finally {
                            setUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      <span>
                        {uploading
                          ? "Bezig met uploaden…"
                          : "Kies of sleep foto's van je heftruck"}
                      </span>
                    </label>
                    {uploadMsg && <p className="photo-msg photo-msg-error">{uploadMsg}</p>}
                    {photos.length > 0 && (
                      <p className="photo-msg">
                        {photos.length === 1
                          ? "1 foto geüpload"
                          : `${photos.length} foto's geüpload`}
                      </p>
                    )}
                    {photos.length > 0 && (
                      <div className="photo-grid">
                        {photos.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p.id} src={p.url} alt="Upload" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Link href="/" className="form-next">
                  Terug naar home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
