"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login mislukt");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="crm-login">
      <div className="crm-login-box">
        <h1 className="crm-title">CRM login</h1>
        <p className="crm-subtitle">heftruckverkocht.nl bemiddeling</p>
        <form
          className="crm-form"
          onSubmit={onSubmit}
          style={{ marginTop: "1.25rem" }}
        >
          <label>
            E-mail (@heftruckverkocht.nl)
            <input
              className="crm-input"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              placeholder="naam@heftruckverkocht.nl"
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
      </div>
    </div>
  );
}
