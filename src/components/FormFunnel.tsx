"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { BRANDS, TIMING_OPTIONS } from "@/lib/constants";
import { vehicleLabel } from "@/lib/status";
import {
  captureFbclidFromUrl,
  createMetaEventId,
  ensureFbp,
  readMetaBrowserCookies,
  trackMetaBrowserEvent,
} from "@/components/MetaPixel";
import { trackFormStep } from "@/lib/funnel-client";
import type { FunnelStep } from "@/lib/funnel";

type Step =
  | "brand"
  | "model"
  | "timing"
  | "price"
  | "name"
  | "loading"
  | "contact"
  | "done";

const STEPS: Step[] = [
  "brand",
  "model",
  "timing",
  "price",
  "name",
  "loading",
  "contact",
  "done",
];

const TOTAL = 7;
const STORAGE_KEY = "hv-form-funnel-v1";
const FIELD_HINT = "Vul dit nog in";

type Persisted = {
  merk: string;
  model: string;
  timing: string;
  richtprijs: string;
  naam: string;
  email: string;
  telefoon: string;
  woonplaats: string;
  akkoord: boolean;
  leadId: string | null;
  buyerCount: number;
  /** Meta click attribution — bewaren tot submit */
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
};

function parseRichtprijsInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function stepFromNum(n: number): Step {
  const i = Math.min(Math.max(Math.floor(n), 1), STEPS.length) - 1;
  return STEPS[i];
}

function numFromStep(step: Step): number {
  return STEPS.indexOf(step) + 1;
}

function readStored(): Partial<Persisted> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

export function FormFunnel() {
  const router = useRouter();
  const params = useParams<{ step?: string }>();
  const urlNum = Number(params.step || "1");
  const urlStep = stepFromNum(Number.isFinite(urlNum) ? urlNum : 1);

  const stored = useMemo(() => readStored(), []);

  const [merk, setMerk] = useState(stored.merk ?? "");
  const [model, setModel] = useState(stored.model ?? "");
  const [timing, setTiming] = useState(stored.timing ?? "");
  const [richtprijs, setRichtprijs] = useState(stored.richtprijs ?? "");
  const [buyerCount] = useState(
    () => stored.buyerCount ?? Math.floor(Math.random() * 11) + 14,
  );
  const [naam, setNaam] = useState(stored.naam ?? "");
  const [email, setEmail] = useState(stored.email ?? "");
  const [telefoon, setTelefoon] = useState(stored.telefoon ?? "");
  const [woonplaats, setWoonplaats] = useState(stored.woonplaats ?? "");
  const [akkoord, setAkkoord] = useState(stored.akkoord ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [loadChecks, setLoadChecks] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(stored.leadId ?? null);
  const [photos, setPhotos] = useState<{ url: string; id: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [metaFbp, setMetaFbp] = useState<string | null>(stored.fbp ?? null);
  const [metaFbc, setMetaFbc] = useState<string | null>(stored.fbc ?? null);
  const [metaFbclid, setMetaFbclid] = useState<string | null>(
    stored.fbclid ?? null,
  );

  const label = useMemo(() => vehicleLabel(merk, model), [merk, model]);

  // Optimistic step so UI updates immediately; URL remains source of truth
  const [pendingStep, setPendingStep] = useState<Step | null>(null);
  const step = pendingStep ?? urlStep;

  const goTo = useCallback(
    (next: Step, mode: "push" | "replace" = "push") => {
      setFieldErrors({});
      setError("");
      setPendingStep(next);
      let path = `/form/${numFromStep(next)}`;
      const fbclid =
        metaFbclid ||
        (typeof window !== "undefined"
          ? readMetaBrowserCookies().fbclid
          : null);
      if (fbclid) {
        path += `?fbclid=${encodeURIComponent(fbclid)}`;
      }
      if (mode === "replace") router.replace(path, { scroll: false });
      else router.push(path, { scroll: false });
    },
    [router, metaFbclid],
  );

  useEffect(() => {
    setPendingStep(null);
  }, [urlStep]);

  // Lead CR: unieke sessie per formstap
  useEffect(() => {
    trackFormStep(step as FunnelStep);
  }, [step]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Snap Meta click-id bij binnenkomst formulier (en houd vast)
  useEffect(() => {
    captureFbclidFromUrl();
    ensureFbp();
    const { fbp, fbc, fbclid } = readMetaBrowserCookies();
    if (fbp) setMetaFbp((prev) => prev || fbp);
    if (fbc) setMetaFbc((prev) => prev || fbc);
    if (fbclid) setMetaFbclid((prev) => prev || fbclid);
  }, []);

  // Persist fields
  useEffect(() => {
    const data: Persisted = {
      merk,
      model,
      timing,
      richtprijs,
      naam,
      email,
      telefoon,
      woonplaats,
      akkoord,
      leadId,
      buyerCount,
      fbp: metaFbp,
      fbc: metaFbc,
      fbclid: metaFbclid,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [
    merk,
    model,
    timing,
    richtprijs,
    naam,
    email,
    telefoon,
    woonplaats,
    akkoord,
    leadId,
    buyerCount,
    metaFbp,
    metaFbc,
    metaFbclid,
  ]);

  const stepIndex =
    step === "brand"
      ? 1
      : step === "model"
        ? 2
        : step === "timing"
          ? 3
          : step === "price"
            ? 4
            : step === "name"
              ? 5
              : step === "loading"
                ? 6
                : step === "contact"
                  ? 7
                  : 7;

  const barPct =
    step === "done"
      ? 100
      : step === "loading"
        ? 70 + (progress / 100) * 13
        : (stepIndex / TOTAL) * 100;

  const cardHeader = (() => {
    switch (step) {
      case "brand":
        return "Beantwoord een paar simpele vragen en ontvang een vrijblijvend bod. Je zit nergens aan vast!";
      case "model":
        return `Perfect. Welk model is jouw ${merk || "heftruck"}?`;
      case "timing":
        return `Perfect, en wanneer wil je de ${label} het liefst verkopen?`;
      case "price":
        return `Wat is de richtprijs die je ervoor wilt hebben?`;
      case "name":
        return "Hoe mogen we je noemen?";
      case "loading":
        return `We zijn op zoek naar betrouwbare kopers voor je ${label === "heftruck" ? "heftruck" : label}…`;
      case "contact":
        return `Gefeliciteerd ${naam.trim() || ""}! ${buyerCount} dealers hebben interesse in jouw heftruck.`;
      case "done":
        return "Aanmelding ontvangen";
      default:
        return "";
    }
  })();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Guard: don't skip ahead without data
  useEffect(() => {
    if (step === "done" && leadId) return;
    if (step === "done" && !leadId) {
      goTo("contact", "replace");
      return;
    }
    const merkOk = Boolean(merk);
    const priceOk = parseRichtprijsInput(richtprijs) != null;
    if (
      (step === "loading" || step === "contact") &&
      (!merkOk || !timing || !priceOk || naam.trim().length < 2)
    ) {
      if (!merkOk) goTo("brand", "replace");
      else if (!timing) goTo("timing", "replace");
      else if (!priceOk) goTo("price", "replace");
      else goTo("name", "replace");
    }
  }, [step, merk, timing, richtprijs, naam, leadId, goTo]);

  useEffect(() => {
    if (step !== "loading") return;
    setProgress(0);
    setLoadChecks(0);
    const start = Date.now();
    const duration = 4800;
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const t = Math.min(1, (Date.now() - start) / duration);
      // Ease-out so the bar keeps moving visibly with each check
      const eased = 1 - (1 - t) * (1 - t);
      const p = Math.min(100, eased * 100);
      setProgress(p);
      setLoadChecks(p >= 95 ? 3 : p >= 62 ? 2 : p >= 28 ? 1 : 0);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setProgress(100);
        setLoadChecks(3);
        goTo("contact", "replace");
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [step, goTo]);

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = FIELD_HINT;
    if (!telefoon.trim()) nextErrors.telefoon = FIELD_HINT;
    if (!akkoord) nextErrors.akkoord = FIELD_HINT;
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("");
      return;
    }
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const { fbp, fbc, fbclid } = readMetaBrowserCookies();
      // Prefer snapshotted attribution from funnel (survives cookie clears)
      const sendFbp = metaFbp || fbp;
      const sendFbc = metaFbc || fbc;
      const sendFbclid = metaFbclid || fbclid;
      // Eén id voor browser-Pixel én server-CAPI (Meta deduplicatie)
      const metaEventId = createMetaEventId("lead");
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merk: merk || "Onbekend",
          model: model || "Onbekend",
          timing,
          richtprijs: parseRichtprijsInput(richtprijs),
          naam,
          email,
          telefoon: telefoon.trim(),
          woonplaats: "",
          fbp: sendFbp,
          fbc: sendFbc,
          fbclid: sendFbclid,
          metaEventId,
          eventSourceUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      setLeadId(data.id);
      trackMetaBrowserEvent("Lead", {
        eventId: data.metaEventId || metaEventId,
        value: 0,
        currency: "EUR",
      });
      // Direct naar klantportaal (foto's uploaden + status)
      if (typeof data.portalUrl === "string" && data.portalUrl.startsWith("/mijn/")) {
        window.location.assign(data.portalUrl);
        return;
      }
      goTo("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <div className="form-page-inner">
        <header className="form-hero">
          <Link href="/" className="form-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-clean.png" alt="heftruckverkocht.nl" />
          </Link>
          <div className="form-avatar-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="form-avatar"
              src="/images/advisor.jpg"
              alt="Persoonlijke adviseur"
            />
            <span className="form-avatar-badge" aria-hidden="true">
              ★ 9.8
            </span>
          </div>
        </header>

        <div className="form-banner">
          <p>
            Wij bieden jouw heftruck aan binnen ons netwerk van 150+
            heftruckbedrijven voor de beste prijs
          </p>
        </div>

        {step !== "done" && (
          <div className="form-progress">
            <div className="form-progress-labels">
              <span>Gratis aanmelden</span>
              <span>
                Stap {Math.min(stepIndex, TOTAL)} van {TOTAL}
              </span>
            </div>
            <div className="form-progress-bar">
              <div style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}

        <div className="form-card">
          <div className="form-card-head">
            <h1>{cardHeader}</h1>
          </div>
          <div className="form-card-body">
            {step === "brand" && (
              <div className="form-step">
                <form
                  className="form-step-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = String(
                      new FormData(e.currentTarget).get("merk") || "",
                    ).trim();
                    if (!value) {
                      setFieldErrors({ merk: FIELD_HINT });
                      return;
                    }
                    setMerk(value);
                    goTo("model");
                  }}
                >
                  <select
                    name="merk"
                    className={`form-field${fieldErrors.merk ? " is-invalid" : ""}`}
                    value={merk === "Onbekend" ? "" : merk}
                    onChange={(e) => {
                      setMerk(e.target.value);
                      clearFieldError("merk");
                    }}
                  >
                    <option value="">Kies een merk…</option>
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.merk && (
                    <p className="form-field-error" role="alert">
                      {fieldErrors.merk}
                    </p>
                  )}
                  <button
                    type="button"
                    className="form-ghost"
                    onClick={() => {
                      setMerk("Onbekend");
                      setFieldErrors({});
                      goTo("model");
                    }}
                  >
                    Ik weet het niet / anders
                  </button>
                  <button type="submit" className="form-next">
                    Volgende →
                  </button>
                </form>
              </div>
            )}

            {step === "model" && (
              <div className="form-step">
                <form
                  className="form-step-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = String(
                      new FormData(e.currentTarget).get("model") || "",
                    ).trim();
                    if (!value) {
                      setFieldErrors({ model: FIELD_HINT });
                      return;
                    }
                    setModel(value);
                    goTo("timing");
                  }}
                >
                  <input
                    name="model"
                    className={`form-field${fieldErrors.model ? " is-invalid" : ""}`}
                    placeholder="Model (bijv. RX60-35)"
                    value={model === "Onbekend" ? "" : model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      clearFieldError("model");
                    }}
                    autoComplete="off"
                  />
                  {fieldErrors.model && (
                    <p className="form-field-error" role="alert">
                      {fieldErrors.model}
                    </p>
                  )}
                  <button
                    type="button"
                    className="form-ghost"
                    onClick={() => {
                      setModel("Onbekend");
                      setFieldErrors({});
                      goTo("timing");
                    }}
                  >
                    Ik weet het niet
                  </button>
                  <button type="submit" className="form-next">
                    Volgende →
                  </button>
                  <button
                    type="button"
                    className="form-back"
                    onClick={() => goTo("brand")}
                  >
                    ← Terug
                  </button>
                </form>
              </div>
            )}

            {step === "timing" && (
              <div className="form-step">
                <form
                  className="form-step-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = String(
                      new FormData(e.currentTarget).get("timing") || "",
                    ).trim();
                    if (!value) {
                      setFieldErrors({ timing: FIELD_HINT });
                      return;
                    }
                    setTiming(value);
                    goTo("price");
                  }}
                >
                  <select
                    name="timing"
                    className={`form-field${fieldErrors.timing ? " is-invalid" : ""}`}
                    value={timing}
                    onChange={(e) => {
                      setTiming(e.target.value);
                      clearFieldError("timing");
                    }}
                  >
                    <option value="">Kies timing…</option>
                    {TIMING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.timing && (
                    <p className="form-field-error" role="alert">
                      {fieldErrors.timing}
                    </p>
                  )}
                  <button type="submit" className="form-next">
                    Volgende →
                  </button>
                  <button
                    type="button"
                    className="form-back"
                    onClick={() => goTo("model")}
                  >
                    ← Terug
                  </button>
                </form>
              </div>
            )}

            {step === "price" && (
              <div className="form-step">
                <form
                  className="form-step-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = String(
                      new FormData(e.currentTarget).get("richtprijs") || "",
                    );
                    const parsed = parseRichtprijsInput(value);
                    if (parsed == null) {
                      setFieldErrors({ richtprijs: FIELD_HINT });
                      return;
                    }
                    setRichtprijs(String(parsed));
                    goTo("name");
                  }}
                >
                  <div
                    className={`form-euro-field${fieldErrors.richtprijs ? " is-invalid" : ""}`}
                  >
                    <span className="form-euro-prefix" aria-hidden="true">
                      €
                    </span>
                    <input
                      name="richtprijs"
                      className={`form-field${fieldErrors.richtprijs ? " is-invalid" : ""}`}
                      inputMode="numeric"
                      placeholder="Bijv. 12500"
                      value={richtprijs}
                      onChange={(e) => {
                        setRichtprijs(e.target.value.replace(/[^\d.,\s]/g, ""));
                        clearFieldError("richtprijs");
                      }}
                      autoComplete="off"
                      aria-label="Richtprijs in euro"
                    />
                  </div>
                  {fieldErrors.richtprijs && (
                    <p className="form-field-error" role="alert">
                      {fieldErrors.richtprijs}
                    </p>
                  )}
                  <button type="submit" className="form-next">
                    Volgende →
                  </button>
                  <button
                    type="button"
                    className="form-back"
                    onClick={() => goTo("timing")}
                  >
                    ← Terug
                  </button>
                </form>
              </div>
            )}

            {step === "name" && (
              <div className="form-step">
                <form
                  className="form-step-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = String(
                      new FormData(e.currentTarget).get("naam") || "",
                    ).trim();
                    if (value.length < 2) {
                      setFieldErrors({ naam: FIELD_HINT });
                      return;
                    }
                    setNaam(value);
                    goTo("loading");
                  }}
                >
                  <input
                    name="naam"
                    className={`form-field${fieldErrors.naam ? " is-invalid" : ""}`}
                    placeholder="Voornaam"
                    value={naam}
                    onChange={(e) => {
                      setNaam(e.target.value);
                      clearFieldError("naam");
                    }}
                    autoComplete="given-name"
                    enterKeyHint="next"
                  />
                  {fieldErrors.naam && (
                    <p className="form-field-error" role="alert">
                      {fieldErrors.naam}
                    </p>
                  )}
                  <button type="submit" className="form-next">
                    Volgende →
                  </button>
                  <button
                    type="button"
                    className="form-back"
                    onClick={() => goTo("price")}
                  >
                    ← Terug
                  </button>
                </form>
              </div>
            )}

            {step === "loading" && (
              <div className="form-step form-loading">
                <div className="form-load-bar">
                  <div
                    style={{ "--load-p": progress / 100 } as CSSProperties}
                  />
                </div>
                <ul className="form-load-list">
                  <li className={loadChecks >= 1 ? "done" : ""}>
                    Ons netwerk van 150+ heftruckbedrijven wordt doorzocht
                  </li>
                  <li className={loadChecks >= 2 ? "done" : ""}>
                    Geïnteresseerde kopers in jouw regio worden gevonden
                  </li>
                  <li className={loadChecks >= 3 ? "done" : ""}>
                    De beste worden op de hoogte gebracht
                  </li>
                </ul>
              </div>
            )}

            {step === "contact" && (
              <div className="form-step">
                <form
                  className="form-fields form-contact"
                  onSubmit={submitLead}
                  noValidate
                >
                  <div className="form-contact-fields">
                    <input
                      className={`form-field${fieldErrors.email ? " is-invalid" : ""}`}
                      type="email"
                      inputMode="email"
                      placeholder="E-mail"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      autoComplete="email"
                    />
                    {fieldErrors.email && (
                      <p className="form-field-error" role="alert">
                        {fieldErrors.email}
                      </p>
                    )}
                    <input
                      className={`form-field${fieldErrors.telefoon ? " is-invalid" : ""}`}
                      type="tel"
                      inputMode="tel"
                      placeholder="Telefoonnummer"
                      value={telefoon}
                      onChange={(e) => {
                        setTelefoon(e.target.value);
                        clearFieldError("telefoon");
                      }}
                      autoComplete="tel"
                      aria-label="Telefoonnummer"
                    />
                    {fieldErrors.telefoon && (
                      <p className="form-field-error" role="alert">
                        {fieldErrors.telefoon}
                      </p>
                    )}
                    <label className="form-terms">
                      <input
                        type="checkbox"
                        checked={akkoord}
                        onChange={(e) => {
                          setAkkoord(e.target.checked);
                          clearFieldError("akkoord");
                        }}
                      />
                      <span>
                        Ik ga akkoord met de{" "}
                        <a
                          href="/algemene-voorwaarden"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          algemene voorwaarden
                        </a>
                      </span>
                    </label>
                    {fieldErrors.akkoord && (
                      <p className="form-field-error form-field-error-left">
                        {fieldErrors.akkoord}
                      </p>
                    )}
                    {error && <p className="form-error">{error}</p>}
                  </div>
                  <div className="form-contact-actions">
                    <button
                      type="submit"
                      className="form-next"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Bezig…"
                        : "Meld mijn heftruck vrijblijvend aan"}
                    </button>
                    <button
                      type="button"
                      className="form-back"
                      onClick={() => goTo("name")}
                    >
                      ← Terug
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === "done" && (
              <div className="form-step form-done">
                <p className="form-done-lead">
                  We nemen zo snel mogelijk contact met je op. Om sneller de
                  beste prijs voor je{" "}
                  <strong>{label === "heftruck" ? "heftruck" : label}</strong>{" "}
                  te krijgen kun je alvast foto&apos;s uploaden.
                </p>
                <p className="form-done-stat">
                  Wie foto&apos;s uploadt, verkoopt gemiddeld voor 29% meer en 4
                  uur sneller
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
                            const { compressImagesForUpload } = await import(
                              "@/lib/client-image"
                            );
                            const compressed = await compressImagesForUpload(
                              Array.from(files),
                            );
                            const added: { id: string; url: string }[] = [];
                            for (const file of compressed) {
                              const body = new FormData();
                              body.append("photos", file);
                              const res = await fetch(
                                `/api/leads/${leadId}/photos`,
                                { method: "POST", body },
                              );
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                throw new Error(
                                  (data as { error?: string }).error ||
                                    (res.status === 413
                                      ? "Foto is te groot. Probeer een kleinere foto."
                                      : "Upload mislukt"),
                                );
                              }
                              const photos = (
                                data as {
                                  photos?: { id: string; url: string }[];
                                }
                              ).photos;
                              for (const p of photos ?? []) {
                                added.push({ id: p.id, url: p.url });
                              }
                            }
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
                    {uploadMsg && (
                      <p className="photo-msg photo-msg-error">{uploadMsg}</p>
                    )}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
