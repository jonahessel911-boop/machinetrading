"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DealerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/marketplace";
  const invite = searchParams.get("invite") || "";
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "1") {
      setInfo("Wachtwoord gewijzigd. Log nu in met je nieuwe wachtwoord.");
    }
  }, [searchParams]);

  function safeNext(justActivated: boolean) {
    const base =
      nextPath.startsWith("/marketplace") || nextPath.startsWith("/dealer")
        ? nextPath
        : "/marketplace";
    if (!justActivated) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}activated=1`;
  }

  useEffect(() => {
    if (!invite) return;
    router.replace(
      `/dealer/onboarding?invite=${encodeURIComponent(invite)}`,
    );
  }, [invite, router]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/dealer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login mislukt");
      router.push(safeNext(Boolean(data.justActivated)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt");
      setLoading(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/dealer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mail versturen mislukt");
      setInfo(
        data.message ||
          "Als dit e-mailadres bij ons bekend is, ontvang je zo een link.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mail versturen mislukt",
      );
    } finally {
      setLoading(false);
    }
  }

  if (invite) {
    return (
      <div className="crm-login-box">
        <h1 className="crm-title">Uitnodiging</h1>
        <p className="crm-subtitle">Doorsturen naar onboarding…</p>
      </div>
    );
  }

  return (
    <div className="crm-login-box">
      <h1 className="crm-title">
        {mode === "login" ? "Inloggen Marketplace" : "Wachtwoord vergeten"}
      </h1>
      <p className="crm-subtitle">
        {mode === "login"
          ? "Dealer login"
          : "We sturen je een link om een nieuw wachtwoord te kiezen"}
      </p>

      {mode === "login" ? (
        <form
          className="crm-form"
          onSubmit={onLogin}
          style={{ marginTop: "1.25rem" }}
        >
          <label>
            E-mail
            <input
              className="crm-input"
              type="email"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="email"
              placeholder="naam@bedrijf.nl"
              required
            />
          </label>
          <label>
            Wachtwoord
            <input
              className="crm-input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p style={{ color: "#ba0517", margin: 0, fontWeight: 700 }}>
              {error}
            </p>
          )}
          {info && mode === "login" ? (
            <p style={{ color: "#0b5cab", margin: 0, fontWeight: 600 }}>
              {info}
            </p>
          ) : null}
          <button
            className="crm-btn crm-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Bezig…" : "Inloggen"}
          </button>
          <button
            type="button"
            className="crm-btn"
            disabled={loading}
            onClick={() => {
              setMode("forgot");
              setError("");
              setInfo("");
              setPass("");
            }}
          >
            Wachtwoord vergeten?
          </button>
        </form>
      ) : (
        <form
          className="crm-form"
          onSubmit={onForgot}
          style={{ marginTop: "1.25rem" }}
        >
          <label>
            E-mail
            <input
              className="crm-input"
              type="email"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="email"
              placeholder="naam@bedrijf.nl"
              required
            />
          </label>
          {error && (
            <p style={{ color: "#ba0517", margin: 0, fontWeight: 700 }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{ color: "#0b5cab", margin: 0, fontWeight: 600 }}>
              {info}
            </p>
          )}
          <button
            className="crm-btn crm-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Bezig…" : "Reset-link versturen"}
          </button>
          <button
            type="button"
            className="crm-btn"
            disabled={loading}
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
            }}
          >
            ← Terug naar inloggen
          </button>
        </form>
      )}

      <p className="crm-muted" style={{ marginTop: "1rem" }}>
        <a href="/marketplace">← Terug naar marketplace</a>
      </p>
    </div>
  );
}

export default function DealerLoginPage() {
  return (
    <div className="crm-login">
      <Suspense
        fallback={
          <div className="crm-login-box">
            <h1 className="crm-title">Inloggen Marketplace</h1>
            <p className="crm-subtitle">Laden…</p>
          </div>
        }
      >
        <DealerLoginForm />
      </Suspense>
    </div>
  );
}
