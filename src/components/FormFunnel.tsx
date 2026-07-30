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
import { formatNlMobileDisplay, toE164NlMobile } from "@/lib/phone";
import { vehicleLabel } from "@/lib/status";
import {
  readMetaBrowserCookies,
  trackMetaBrowserEvent,
} from "@/components/MetaPixel";

type Step =
  | "brand"
  | "model"
  | "timing"
  | "name"
  | "loading"
  | "contact"
  | "done";

const STEPS: Step[] = [
  "brand",
  "model",
  "timing",
  "name",
  "loading",
  "contact",
  "done",
];

const TOTAL = 6;
const STORAGE_KEY = "hv-form-funnel-v1";

type Persisted = {
  merk: string;
  model: string;
  timing: string;
  naam: string;
  email: string;
  telefoon: string;
  woonplaats: string;
  akkoord: boolean;
  leadId: string | null;
  buyerCount: number;
};

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

  const [step, setStep] = useState<Step>(urlStep);
  const [merk, setMerk] = useState(stored.merk ?? "");
  const [model, setModel] = useState(stored.model ?? "");
  const [timing, setTiming] = useState(stored.timing ?? "");
  const [buyerCount] = useState(
    () => stored.buyerCount ?? Math.floor(Math.random() * 11) + 14,
  );
  const [naam, setNaam] = useState(stored.naam ?? "");
  const [email, setEmail] = useState(stored.email ?? "");
  const [telefoon, setTelefoon] = useState(() =>
    formatNlMobileDisplay(stored.telefoon ?? ""),
  );
  const [woonplaats, setWoonplaats] = useState(stored.woonplaats ?? "");
  const [akkoord, setAkkoord] = useState(stored.akkoord ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [loadChecks, setLoadChecks] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(stored.leadId ?? null);
  const [photos, setPhotos] = useState<{ url: string; id: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const label = useMemo(() => vehicleLabel(merk, model), [merk, model]);

  const goTo = useCallback(
    (next: Step, mode: "push" | "replace" = "push") => {
      setStep(next);
      const path = `/form/${numFromStep(next)}`;
      if (mode === "replace") router.replace(path, { scroll: false });
      else router.push(path, { scroll: false });
    },
    [router],
  );

  // Sync from URL (browser back/forward or deep link)
  useEffect(() => {
    if (urlStep !== step) setStep(urlStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStep]);

  // Persist fields
  useEffect(() => {
    const data: Persisted = {
      merk,
      model,
      timing,
      naam,
      email,
      telefoon,
      woonplaats,
      akkoord,
      leadId,
      buyerCount,
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
    naam,
    email,
    telefoon,
    woonplaats,
    akkoord,
    leadId,
    buyerCount,
  ]);

  const stepIndex =
    step === "brand"
      ? 1
      : step === "model"
        ? 2
        : step === "timing"
          ? 3
          : step === "name"
            ? 4
            : step === "loading"
              ? 5
              : step === "contact"
                ? 6
                : 6;

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
      case "name":
        return "Hoe mogen we je noemen?";
      case "loading":
        return `We zijn op zoek naar betrouwbare kopers voor je ${label === "heftruck" ? "heftruck" : label}…`;
      case "contact":
        return `Gefeliciteerd ${naam.trim() || ""}! We hebben ${buyerCount} dealers gevonden die interesse hebben in jouw heftruck!`;
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
    if (
      (step === "loading" || step === "contact") &&
      (!merk || !timing || naam.trim().length < 2)
    ) {
      if (!merk) goTo("brand", "replace");
      else if (!timing) goTo("timing", "replace");
      else goTo("name", "replace");
    }
  }, [step, merk, timing, naam, leadId, goTo]);

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
    if (!akkoord) {
      setError("Je moet akkoord gaan met de algemene voorwaarden.");
      return;
    }
    const phoneE164 = toE164NlMobile(telefoon);
    if (!phoneE164) {
      setError("Vul een geldig Nederlands mobiel nummer in (06… / +31 6…).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { fbp, fbc } = readMetaBrowserCookies();
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merk: merk || "Onbekend",
          model: model || "Onbekend",
          timing,
          naam,
          email,
          telefoon: phoneE164,
          woonplaats,
          fbp,
          fbc,
          eventSourceUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      setLeadId(data.id);
      trackMetaBrowserEvent("Lead", {
        eventId: data.metaEventId || `lead-${data.id}`,
        value: 0,
        currency: "EUR",
      });
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
                    goTo("model");
                  }}
                >
                  Ik weet het niet / anders
                </button>
                <button
                  type="button"
                  className="form-next"
                  disabled={!merk}
                  onClick={() => goTo("model")}
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
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="form-ghost"
                  onClick={() => {
                    setModel("Onbekend");
                    goTo("timing");
                  }}
                >
                  Ik weet het niet
                </button>
                <button
                  type="button"
                  className="form-next"
                  disabled={!model.trim()}
                  onClick={() => goTo("timing")}
                >
                  Volgende →
                </button>
                <button
                  type="button"
                  className="form-back"
                  onClick={() => goTo("brand")}
                >
                  ← Terug
                </button>
              </div>
            )}

            {step === "timing" && (
              <div className="form-step">
                <select
                  className="form-field"
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                >
                  <option value="">Kies timing…</option>
                  {TIMING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="form-next"
                  disabled={!timing}
                  onClick={() => goTo("name")}
                >
                  Volgende →
                </button>
                <button
                  type="button"
                  className="form-back"
                  onClick={() => goTo("model")}
                >
                  ← Terug
                </button>
              </div>
            )}

            {step === "name" && (
              <div className="form-step">
                <input
                  className="form-field"
                  placeholder="Voornaam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  autoComplete="given-name"
                  enterKeyHint="next"
                />
                <button
                  type="button"
                  className="form-next"
                  disabled={naam.trim().length < 2}
                  onClick={() => goTo("loading")}
                >
                  Volgende →
                </button>
                <button
                  type="button"
                  className="form-back"
                  onClick={() => goTo("timing")}
                >
                  ← Terug
                </button>
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
                <form className="form-fields" onSubmit={submitLead}>
                  <input
                    className="form-field"
                    required
                    type="email"
                    inputMode="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <div className="form-phone">
                    <span className="form-phone-flag" aria-hidden="true">
                      🇳🇱
                    </span>
                    <input
                      className="form-field form-phone-input"
                      required
                      type="tel"
                      inputMode="tel"
                      placeholder="+31 6 12 34 56 78"
                      value={telefoon}
                      onChange={(e) =>
                        setTelefoon(formatNlMobileDisplay(e.target.value))
                      }
                      onBlur={() => {
                        if (telefoon && !telefoon.startsWith("+31")) {
                          setTelefoon(formatNlMobileDisplay(telefoon));
                        }
                      }}
                      autoComplete="tel"
                      aria-label="Mobiel telefoonnummer"
                    />
                  </div>
                  <input
                    className="form-field"
                    required
                    placeholder="Woonplaats"
                    value={woonplaats}
                    onChange={(e) => setWoonplaats(e.target.value)}
                    autoComplete="address-level2"
                  />
                  <label className="form-terms">
                    <input
                      type="checkbox"
                      checked={akkoord}
                      onChange={(e) => setAkkoord(e.target.checked)}
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
                  {error && <p className="form-error">{error}</p>}
                  <button
                    type="submit"
                    className="form-next"
                    disabled={submitting || !akkoord}
                  >
                    {submitting
                      ? "Bezig…"
                      : "Meld mijn heftruck vrijblijvend aan"}
                  </button>
                </form>
                <button
                  type="button"
                  className="form-back"
                  onClick={() => goTo("name")}
                >
                  ← Terug
                </button>
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
