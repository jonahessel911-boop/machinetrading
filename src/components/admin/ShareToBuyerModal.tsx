"use client";

import { useEffect, useState } from "react";

type BuyerHit = {
  id: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  bedrijf: string;
  leadCount: number;
};

export function ShareToBuyerModal({
  leadId,
  omschrijving = "",
  open,
  onClose,
  onDone,
}: {
  leadId: string;
  /** Actuele marketplace-omschrijving uit het lead-formulier */
  omschrijving?: string;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [mode, setMode] = useState<"list" | "email">("list");
  const [q, setQ] = useState("");
  const [buyers, setBuyers] = useState<BuyerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [naam, setNaam] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("list");
    setQ("");
    setEmail("");
    setNaam("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "list") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/marketplace/share?q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Laden mislukt");
        if (!cancelled) setBuyers(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fout");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, q, mode]);

  if (!open) return null;

  async function sendTo(opts: {
    email: string;
    greetingName: string;
  }) {
    if (!opts.email) {
      setError("Geen e-mailadres beschikbaar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/marketplace/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          email: opts.email,
          greetingName: opts.greetingName,
          omschrijving,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Versturen mislukt");
      onDone(data.message || `Verstuurd naar ${opts.email}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-modal-backdrop" role="dialog" aria-modal="true">
      <div className="crm-modal" style={{ maxWidth: 560 }}>
        <div className="crm-modal-head">
          <h2>Stuur naar handelaar</h2>
          <button type="button" className="crm-btn" onClick={onClose}>
            Sluiten
          </button>
        </div>
        <div className="crm-modal-body">
          <p className="crm-muted" style={{ marginTop: 0 }}>
            Ontvanger krijgt een privé-link met foto&apos;s
            {omschrijving.trim() ? " en jouw omschrijving" : " en omschrijving"}{" "}
            — geen login, geen veiling.
          </p>
          {omschrijving.trim() ? (
            <div
              className="crm-muted"
              style={{
                marginBottom: "0.85rem",
                padding: "0.65rem 0.75rem",
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                whiteSpace: "pre-wrap",
                color: "#374151",
                fontSize: "0.92rem",
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>
                Omschrijving op de preview:
              </strong>
              {omschrijving.trim()}
            </div>
          ) : (
            <p className="crm-muted" style={{ marginTop: 0 }}>
              Tip: vul eerst de omschrijving in bij Marketplace — die komt dan
              op de deelpagina te staan.
            </p>
          )}

          <div className="crm-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className={`crm-btn${mode === "list" ? " crm-btn-primary" : ""}`}
              onClick={() => setMode("list")}
              disabled={busy}
            >
              Kies handelaar
            </button>
            <button
              type="button"
              className={`crm-btn${mode === "email" ? " crm-btn-primary" : ""}`}
              onClick={() => setMode("email")}
              disabled={busy}
            >
              E-mail invullen
            </button>
          </div>

          {mode === "list" ? (
            <>
              <label className="crm-modal-label">
                Zoeken
                <input
                  className="crm-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Bedrijf, naam of e-mail…"
                  autoFocus
                />
              </label>

              <div className="crm-modal-list">
                {loading && <p className="crm-muted">Laden…</p>}
                {!loading && buyers.length === 0 && (
                  <p className="crm-muted">Geen handelaren gevonden.</p>
                )}
                {buyers.map((b) => (
                  <div key={b.id} className="crm-modal-row">
                    <div>
                      <strong>{b.bedrijf}</strong>
                      <div className="crm-muted">
                        {b.naam}
                        {b.email ? ` · ${b.email}` : " · geen e-mail"}
                      </div>
                      <div className="crm-muted">
                        {b.leadCount} gekoppelde leads
                      </div>
                    </div>
                    <button
                      type="button"
                      className="crm-btn crm-btn-primary"
                      disabled={busy || !b.email}
                      onClick={() =>
                        sendTo({
                          email: b.email!,
                          greetingName: b.bedrijf || b.naam,
                        })
                      }
                    >
                      Stuur
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form
              className="crm-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendTo({
                  email: email.trim(),
                  greetingName: naam.trim(),
                });
              }}
            >
              <label className="crm-modal-label">
                Naam (optioneel)
                <input
                  className="crm-input"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Leeg = aanhef “Beste,”"
                  autoFocus
                />
              </label>
              <label className="crm-modal-label">
                E-mail
                <input
                  className="crm-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="handelaar@bedrijf.nl"
                />
              </label>
              <button
                type="submit"
                className="crm-btn crm-btn-primary"
                disabled={busy || !email.trim()}
              >
                {busy ? "Versturen…" : "Verstuur link"}
              </button>
            </form>
          )}

          {error && <p className="crm-form-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
