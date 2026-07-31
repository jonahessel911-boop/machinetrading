"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DealerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/marketplace";
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login mislukt");
      }
      const safeNext =
        nextPath.startsWith("/marketplace") || nextPath.startsWith("/dealer")
          ? nextPath
          : "/marketplace";
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="crm-login-box">
      <h1 className="crm-title">Inloggen Marketplace</h1>
      <p className="crm-subtitle">Dealer login</p>
      <form
        className="crm-form"
        onSubmit={onSubmit}
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
          />
        </label>
        {error && (
          <p style={{ color: "#ba0517", margin: 0, fontWeight: 700 }}>
            {error}
          </p>
        )}
        <button
          className="crm-btn crm-btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Bezig…" : "Inloggen"}
        </button>
      </form>
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
