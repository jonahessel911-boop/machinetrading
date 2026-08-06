"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AdminUser } from "@/lib/admin-users";
import { formatDateTime } from "@/lib/status";

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [privateEmail, setPrivateEmail] = useState("");
  const [meId, setMeId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/me"),
      ]);
      const usersData = await usersRes.json();
      const meData = await meRes.json();
      if (!usersRes.ok) throw new Error(usersData.error || "Laden mislukt");
      setUsers(usersData.users ?? []);
      if (meRes.ok) setMeId(meData.userId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email, privateEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setUsers((prev) => [data.user as AdminUser, ...prev]);
      setNaam("");
      setEmail("");
      setPrivateEmail("");
      setMessage(
        data.mailSent
          ? `User aangemaakt. Login: ${data.loginEmail}. Gegevens gemaild naar ${data.to}.`
          : data.warning || "User aangemaakt (mail niet verstuurd).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`User "${label}" verwijderen?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setMessage("User verwijderd.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="crm-page-header">
        <div>
          <p className="crm-subtitle">Beheer</p>
          <h1 className="crm-title">Users</h1>
        </div>
      </div>

      {message && <div className="crm-toast">{message}</div>}
      {error && (
        <div className="crm-toast" style={{ color: "#ba0517" }}>
          {error}
        </div>
      )}

      <div className="crm-two">
        <div className="crm-card">
          <div className="crm-card-head">Nieuwe user</div>
          <div className="crm-card-body">
            <p className="crm-muted" style={{ marginTop: 0 }}>
              Login moet <strong>@heftruckverkocht.nl</strong> zijn. Privé e-mail
              is alleen om het gegenereerde wachtwoord te ontvangen.
            </p>
            <form className="crm-form" onSubmit={onCreate}>
              <label>
                Naam
                <input
                  className="crm-input"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  required
                  placeholder="Voornaam Achternaam"
                  disabled={busy}
                />
              </label>
              <label>
                Login e-mail
                <input
                  className="crm-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="naam@heftruckverkocht.nl"
                  disabled={busy}
                />
              </label>
              <label>
                Privé e-mail (ontvangstgegevens)
                <input
                  className="crm-input"
                  type="email"
                  value={privateEmail}
                  onChange={(e) => setPrivateEmail(e.target.value)}
                  required
                  placeholder="naam@gmail.com"
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                className="crm-btn crm-btn-primary"
                disabled={busy}
              >
                {busy ? "Bezig…" : "User aanmaken"}
              </button>
            </form>
          </div>
        </div>

        <div className="crm-card">
          <div className="crm-card-head">
            Accounts ({users.length})
          </div>
          <div className="crm-card-body">
            {loading ? (
              <p className="crm-muted">Laden…</p>
            ) : users.length === 0 ? (
              <p className="crm-muted">Nog geen users aangemaakt.</p>
            ) : (
              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Naam</th>
                      <th>Login</th>
                      <th>Privé e-mail</th>
                      <th>Aangemaakt</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.naam}</strong>
                          {meId === u.id ? (
                            <span className="crm-muted"> · jij</span>
                          ) : null}
                        </td>
                        <td>{u.email}</td>
                        <td>{u.privateEmail ?? "—"}</td>
                        <td>{formatDateTime(u.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="crm-btn crm-btn-danger"
                            disabled={busy || meId === u.id}
                            onClick={() => onDelete(u.id, u.naam)}
                          >
                            Verwijderen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
