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
  open,
  onClose,
  onDone,
}: {
  leadId: string;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [q, setQ] = useState("");
  const [buyers, setBuyers] = useState<BuyerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailOverride, setEmailOverride] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
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
  }, [open, q]);

  if (!open) return null;

  async function sendTo(opts: {
    email: string;
    toName: string;
    buyerId?: string | null;
  }) {
    if (!opts.email) {
      setError("Geen e-mailadres beschikbaar voor deze handelaar.");
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
          toName: opts.toName,
          buyerId: opts.buyerId ?? null,
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
      <div className="crm-modal">
        <div className="crm-modal-head">
          <h2>Stuur naar handelaar</h2>
          <button type="button" className="crm-btn" onClick={onClose}>
            Sluiten
          </button>
        </div>
        <div className="crm-modal-body">
          <p className="crm-muted">
            Top 10 kopers (meeste gekoppelde heftrucks) of zoek een handelaar.
            Ontvanger krijgt een e-mail met de marketplace-link.
          </p>
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
                  <div className="crm-muted">{b.leadCount} gekoppelde leads</div>
                </div>
                <button
                  type="button"
                  className="crm-btn crm-btn-primary"
                  disabled={busy || !b.email}
                  onClick={() =>
                    sendTo({
                      email: b.email!,
                      toName: b.naam,
                      buyerId: b.id,
                    })
                  }
                >
                  Stuur
                </button>
              </div>
            ))}
          </div>

          <div className="crm-modal-divider">Of stuur naar e-mailadres</div>
          <div className="crm-modal-email-row">
            <input
              className="crm-input"
              type="email"
              placeholder="handelaar@bedrijf.nl"
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
            />
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy || !emailOverride.trim()}
              onClick={() =>
                sendTo({
                  email: emailOverride.trim(),
                  toName: "handelaar",
                })
              }
            >
              Verstuur
            </button>
          </div>
          {error && <p className="crm-form-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
