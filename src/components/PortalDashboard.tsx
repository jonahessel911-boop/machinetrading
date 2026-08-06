"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PortalLeadView } from "@/lib/portal";
import { formatEuro } from "@/lib/status";

const STEPS = [
  { key: "nieuw", label: "Nieuw" },
  { key: "in_behandeling", label: "In behandeling" },
  { key: "verkocht", label: "Verkocht" },
] as const;

function initials(naam: string): string {
  const parts = naam.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateNl(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Amsterdam",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatContactAttempt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Amsterdam",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PortalDashboard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lead, setLead] = useState<PortalLeadView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [omschrijving, setOmschrijving] = useState("");
  const [omschrijvingSaved, setOmschrijvingSaved] = useState(true);
  const [savingDesc, setSavingDesc] = useState(false);
  const [showDescSaved, setShowDescSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/me");
        if (res.status === 401) {
          router.replace("/mijn");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Kon gegevens niet laden");
        }
        if (!cancelled) {
          const view = data.lead as PortalLeadView;
          setLead(view);
          setOmschrijving(view.omschrijving ?? "");
          setOmschrijvingSaved(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fout bij laden");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.replace("/mijn");
    router.refresh();
  }

  async function saveOmschrijving() {
    if (!lead || omschrijvingSaved) return;
    setSavingDesc(true);
    setShowDescSaved(false);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ omschrijving }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setLead(data.lead as PortalLeadView);
      setOmschrijvingSaved(true);
      setShowDescSaved(true);
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSavingDesc(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !lead) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const { compressImagesForUpload } = await import("@/lib/client-image");
      const compressed = await compressImagesForUpload(Array.from(files));
      const added: { id: string; url: string }[] = [];

      // Eén voor één — voorkomt 413 bij meerdere telefoonfoto's
      for (const file of compressed) {
        const body = new FormData();
        body.append("photos", file);
        const res = await fetch("/api/portal/photos", {
          method: "POST",
          body,
        });
        const text = await res.text();
        let data: { error?: string; photos?: { id: string; url: string }[] } =
          {};
        try {
          data = text ? (JSON.parse(text) as typeof data) : {};
        } catch {
          throw new Error(
            res.status === 413
              ? "Foto is te groot. Probeer een kleinere foto."
              : res.ok
                ? "Onverwacht antwoord van de server"
                : `Upload mislukt (${res.status})`,
          );
        }
        if (!res.ok) {
          throw new Error(
            data.error ||
              (res.status === 413
                ? "Foto is te groot. Probeer een kleinere foto."
                : "Upload mislukt"),
          );
        }
        for (const p of data.photos ?? []) {
          added.push({ id: p.id, url: p.url });
        }
      }

      setLead((prev) => {
        if (!prev) return prev;
        const ids = new Set(prev.photos.map((p) => p.id));
        return {
          ...prev,
          photos: [...prev.photos, ...added.filter((p) => !ids.has(p.id))],
        };
      });
      setUploadMsg(
        added.length === 1
          ? "1 foto toegevoegd"
          : `${added.length} foto's toegevoegd`,
      );
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : "Upload mislukt");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="portal-page">
        <div className="portal-shell portal-shell-wide">
          <p className="portal-muted">Laden…</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="portal-page">
        <div className="portal-shell">
          <div className="portal-card">
            <p className="portal-error">{error || "Geen gegevens"}</p>
            <Link className="portal-link" href="/mijn">
              Opnieuw inloggen →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstName = lead.naam.split(/\s+/)[0] || lead.naam;
  const hasContract = lead.contracts.length > 0;
  const contract = lead.contracts[0];
  const activeStep =
    lead.status.key === "verkocht"
      ? 2
      : lead.status.key === "nieuw"
        ? 0
        : 1;

  return (
    <div className="portal-page">
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <Link href="/" className="portal-logo-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-clean.png"
              alt="heftruckverkocht.nl"
            />
          </Link>
          <div className="portal-topbar-right">
            <div className="portal-user-pill" title={lead.naam}>
              <span className="portal-avatar" aria-hidden>
                {initials(lead.naam)}
              </span>
              <span className="portal-user-name">{lead.naam}</span>
            </div>
            <button
              type="button"
              className="portal-logout"
              onClick={logout}
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <div className="portal-shell portal-shell-wide">
        <div className="portal-hero-copy">
          <h1 className="portal-title">Kom verder, {firstName}!</h1>
          <p className="portal-lead">
            In je portaal volg je de status van je verkoop en foto&apos;s.
          </p>
        </div>

        <section className="portal-card" aria-labelledby="aanvraag-heading">
          <div className="portal-card-head">
            <h2 id="aanvraag-heading" className="portal-card-title">
              Je aanvraag
            </h2>
          </div>

          <div className="portal-request-row">
            <div className="portal-request-main">
              <div className="portal-request-text">
                <p className="portal-request-name">{lead.vehicleLabel}</p>
                <p className="portal-request-status">
                  Status: <strong>{lead.status.label}</strong>
                  {lead.woonplaats ? ` · ${lead.woonplaats}` : ""}
                </p>
                {lead.inkoopprijs != null ? (
                  <p className="portal-request-price">
                    Verkoopprijs {formatEuro(lead.inkoopprijs)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="portal-request-meta">
              <time dateTime={lead.createdAt}>
                {formatDateNl(lead.createdAt)}
              </time>
              {hasContract && contract ? (
                <a
                  className="portal-link"
                  href={`/api/portal/contract/${contract.id}/pdf`}
                >
                  Koopovereenkomst downloaden →
                </a>
              ) : null}
            </div>
          </div>

          <div className="portal-status-block">
            <ol className="portal-stepper">
              {STEPS.map((step, i) => {
                const done = i < activeStep;
                const current = i === activeStep;
                return (
                  <li
                    key={step.key}
                    className={
                      done
                        ? "portal-step is-done"
                        : current
                          ? "portal-step is-current"
                          : "portal-step"
                    }
                  >
                    <span className="portal-step-dot" aria-hidden />
                    <span className="portal-step-label">{step.label}</span>
                  </li>
                );
              })}
            </ol>
            <p className="portal-status-copy">{lead.status.description}</p>
            {lead.contactAttemptTimes.length > 0 ? (
              <div className="portal-contact-log">
                <p className="portal-contact-log-title">
                  We hebben je geprobeerd te bereiken om:
                </p>
                <ul className="portal-contact-log-list">
                  {lead.contactAttemptTimes.map((at) => (
                    <li key={at}>
                      <time dateTime={at}>{formatContactAttempt(at)}</time>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="portal-field-block">
            <label className="portal-label" htmlFor="portal-omschrijving">
              Omschrijving
            </label>
            <textarea
              id="portal-omschrijving"
              className="portal-textarea"
              rows={4}
              value={omschrijving}
              placeholder="Bijv. bouwjaar, urenstand, bijzonderheden, staat van de heftruck…"
              onChange={(e) => {
                setOmschrijving(e.target.value);
                setOmschrijvingSaved(false);
                setShowDescSaved(false);
              }}
              onBlur={() => {
                void saveOmschrijving();
              }}
            />
            {savingDesc || showDescSaved ? (
              <p className="portal-field-hint">
                {savingDesc ? "Opslaan…" : "Opgeslagen"}
              </p>
            ) : null}
          </div>

          <div className="portal-field-block">
            <p className="portal-label">Foto&apos;s van je heftruck</p>
            <p className="portal-muted" style={{ marginTop: 0 }}>
              Upload duidelijke foto&apos;s — wie dat doet, verkoopt gemiddeld
              voor 29% meer en sneller.
            </p>
            {lead.photos.length > 0 ? (
              <div className="portal-photos">
                {lead.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.url} alt="" className="portal-photo" />
                ))}
              </div>
            ) : null}

            <div className="portal-photo-tip">
              <p className="portal-photo-tip-text">
                <strong>TIP:</strong> maak een foto van het serienummer
              </p>
              <figure className="portal-photo-example">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/voorbeeld-typeplaatje.png"
                  alt="Voorbeeld van een typeplaatje met serienummer"
                />
                <figcaption>Voorbeeld</figcaption>
              </figure>
            </div>

            <label
              className={`portal-upload-zone${uploading ? " is-busy" : ""}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
                multiple
                disabled={uploading}
                onChange={(e) => {
                  void uploadPhotos(e.target.files);
                }}
              />
              <span className="portal-upload-icon" aria-hidden="true">
                +
              </span>
              <span className="portal-upload-title">
                {uploading
                  ? "Bezig met uploaden…"
                  : lead.photos.length > 0
                    ? "Meer foto's toevoegen"
                    : "Selecteer of sleep foto's"}
              </span>
              <span className="portal-upload-hint">
                Tip: voorkant, zijkant, typeplaatje en eventuele schade
              </span>
              <span className="portal-upload-btn">
                {uploading ? "Even geduld…" : "Kies foto's van je telefoon"}
              </span>
            </label>
            {uploadMsg ? (
              <p
                className="portal-field-hint"
                style={
                  /mislukt|fout|groot|niet toegestaan|Unauthorized/i.test(
                    uploadMsg,
                  )
                    ? { color: "#ba0517" }
                    : undefined
                }
              >
                {uploadMsg}
              </p>
            ) : null}
          </div>
        </section>

        <section className="portal-card" aria-labelledby="help-heading">
          <h2 id="help-heading" className="portal-card-title">
            Hulp nodig?
          </h2>
          <p className="portal-help-copy">
            Vragen over je aanvraag of de verkoop? We helpen je graag.
          </p>
          <a className="portal-link" href="mailto:info@heftruckverkocht.nl">
            Mail info@heftruckverkocht.nl →
          </a>
          <a className="portal-link" href="tel:0858001645">
            Bel 085 800 1645 →
          </a>
        </section>
      </div>
    </div>
  );
}
