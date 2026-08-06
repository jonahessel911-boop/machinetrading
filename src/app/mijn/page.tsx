"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function PortalLoginForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(
          typeof data.error === "string"
            ? data.error
            : "Kon de link niet versturen.",
        );
        return;
      }
      setStatus("sent");
      setMessage(
        typeof data.message === "string"
          ? data.message
          : "Check je inbox — we hebben een link gestuurd.",
      );
    } catch {
      setStatus("error");
      setMessage("Er ging iets mis. Probeer het later opnieuw.");
    }
  }

  return (
    <>
      {linkError ? (
        <p className="portal-error" role="alert">
          Deze link is ongeldig of verlopen. Vraag hieronder een nieuwe aan.
        </p>
      ) : null}

      {status === "sent" ? (
        <div className="portal-success" role="status">
          <p>{message}</p>
          <p className="portal-muted">
            Geen mail? Check je spam of probeer opnieuw over een paar minuten.
          </p>
        </div>
      ) : (
        <form className="portal-form" onSubmit={onSubmit}>
          <label className="portal-label">
            E-mailadres
            <input
              className="portal-input"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
            />
          </label>
          {status === "error" && (
            <p className="portal-error" role="alert">
              {message}
            </p>
          )}
          <button
            className="portal-btn"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Bezig…" : "Stuur mij een link"}
          </button>
        </form>
      )}
    </>
  );
}

export default function PortalLoginPage() {
  return (
    <div className="portal-page">
      <header className="portal-topbar">
        <div className="portal-topbar-inner" style={{ width: "min(440px, 100%)" }}>
          <Link href="/" className="portal-logo-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-clean.png" alt="heftruckverkocht.nl" />
          </Link>
        </div>
      </header>
      <div className="portal-shell">
        <div className="portal-hero-copy">
          <h1 className="portal-title">Mijn aanvraag</h1>
          <p className="portal-lead">
            Vul het e-mailadres in waarmee je je hebt aangemeld. We sturen je
            een beveiligde link.
          </p>
        </div>

        <div className="portal-card">
          <Suspense fallback={<p className="portal-muted">Laden…</p>}>
            <PortalLoginForm />
          </Suspense>
        </div>

        <p className="portal-footer-link">
          <Link href="/form/1">Nog geen aanvraag? Meld je aan →</Link>
        </p>
      </div>
    </div>
  );
}
