"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Ongeldige of verlopen reset-link");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wijzigen mislukt");
      router.push("/dealer/login?reset=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wijzigen mislukt");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="crm-login-box">
        <h1 className="crm-title">Reset-link ongeldig</h1>
        <p className="crm-subtitle">
          Vraag een nieuwe link aan via de inlogpagina.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <a className="crm-btn crm-btn-primary" href="/dealer/login">
            Naar inloggen
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="crm-login-box">
      <h1 className="crm-title">Nieuw wachtwoord</h1>
      <p className="crm-subtitle">Kies een nieuw wachtwoord voor je account</p>
      <form
        className="crm-form"
        onSubmit={onSubmit}
        style={{ marginTop: "1.25rem" }}
      >
        <label>
          Nieuw wachtwoord
          <input
            className="crm-input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimaal 8 tekens"
          />
        </label>
        <label>
          Bevestig wachtwoord
          <input
            className="crm-input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
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
          {loading ? "Bezig…" : "Wachtwoord opslaan"}
        </button>
      </form>
      <p className="crm-muted" style={{ marginTop: "1rem" }}>
        <a href="/dealer/login">← Terug naar inloggen</a>
      </p>
    </div>
  );
}

export default function DealerResetPage() {
  return (
    <div className="crm-login">
      <Suspense
        fallback={
          <div className="crm-login-box">
            <h1 className="crm-title">Nieuw wachtwoord</h1>
            <p className="crm-subtitle">Laden…</p>
          </div>
        }
      >
        <ResetForm />
      </Suspense>
    </div>
  );
}
