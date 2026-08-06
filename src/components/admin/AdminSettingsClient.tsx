"use client";

import { FormEvent, useEffect, useState } from "react";

export function AdminSettingsClient() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [canChangePassword, setCanChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Laden mislukt");
        if (!cancelled) {
          setNaam(data.naam ?? "");
          setEmail(data.email ?? "");
          setCanChangePassword(Boolean(data.canChangePassword));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fout");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wijzigen mislukt");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Wachtwoord gewijzigd.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="crm-muted">Laden…</p>;
  }

  return (
    <>
      <div className="crm-page-header">
        <div>
          <p className="crm-subtitle">Account</p>
          <h1 className="crm-title">Instellingen</h1>
        </div>
      </div>

      {message && <div className="crm-toast">{message}</div>}
      {error && (
        <div className="crm-toast" style={{ color: "#ba0517" }}>
          {error}
        </div>
      )}

      <div className="crm-card" style={{ maxWidth: 480 }}>
        <div className="crm-card-head">Profiel</div>
        <div className="crm-card-body">
          <div className="crm-fields">
            <div className="crm-field">
              <label>Naam</label>
              <div>{naam || "—"}</div>
            </div>
            <div className="crm-field">
              <label>E-mail / login</label>
              <div>{email || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-card" style={{ maxWidth: 480, marginTop: "1rem" }}>
        <div className="crm-card-head">Wachtwoord wijzigen</div>
        <div className="crm-card-body">
          {!canChangePassword ? (
            <p className="crm-muted" style={{ margin: 0 }}>
              Je bent ingelogd met het systeem-account (env). Wachtwoord wijzigen
              kan hier niet — maak een user aan onder Users, of wijzig{" "}
              <code>ADMIN_PASS</code> in Vercel.
            </p>
          ) : (
            <form className="crm-form" onSubmit={onSubmit}>
              <label>
                Huidig wachtwoord
                <input
                  className="crm-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={busy}
                />
              </label>
              <label>
                Nieuw wachtwoord
                <input
                  className="crm-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={busy}
                />
              </label>
              <label>
                Bevestig nieuw wachtwoord
                <input
                  className="crm-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                className="crm-btn crm-btn-primary"
                disabled={busy}
              >
                {busy ? "Bezig…" : "Wachtwoord opslaan"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
