"use client";

import { useEffect, useState } from "react";
import type { LeadMessage } from "@/lib/lead-messages";
import { formatDateTime } from "@/lib/status";

export function NewLeadMessageModal({
  leadId,
  leadNaam,
  open,
  onClose,
  onSent,
}: {
  leadId: string;
  leadNaam: string;
  open: boolean;
  onClose: () => void;
  onSent: (message: LeadMessage) => void;
}) {
  const firstName = leadNaam.trim().split(/\s+/)[0] || leadNaam;
  const [subject, setSubject] = useState("Bericht van heftruckverkocht.nl");
  const [body, setBody] = useState(`Beste ${firstName},\n\n\n`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubject("Bericht van heftruckverkocht.nl");
    setBody(`Beste ${firstName},\n\n\n`);
    setError("");
    setBusy(false);
  }, [open, firstName]);

  if (!open) return null;

  async function send() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Versturen mislukt");
      onSent(data.message as LeadMessage);
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
          <h2>Nieuw bericht</h2>
          <button type="button" className="crm-btn" onClick={onClose}>
            Sluiten
          </button>
        </div>
        <div className="crm-modal-body">
          <p className="crm-muted" style={{ marginTop: 0 }}>
            Mail naar de lead. Antwoorden gaan naar info@heftruckverkocht.nl
            (Reply-To).
          </p>
          <label className="crm-modal-label">
            Onderwerp
            <input
              className="crm-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="crm-modal-label">
            Bericht
            <textarea
              className="crm-input"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </label>
          {error && <p className="crm-form-error">{error}</p>}
          <div className="crm-actions" style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy}
              onClick={send}
            >
              {busy ? "Versturen…" : "Verstuur bericht"}
            </button>
            <button
              type="button"
              className="crm-btn"
              disabled={busy}
              onClick={onClose}
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadMessagesCard({
  leadId,
  leadNaam,
}: {
  leadId: string;
  leadNaam: string;
}) {
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/leads/${leadId}/messages`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Laden mislukt");
        if (!cancelled) setMessages(data.messages ?? []);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return (
    <>
      <div className="crm-card">
        <div className="crm-card-head">
          Berichten ({messages.length})
        </div>
        <div className="crm-card-body">
          <div className="crm-actions" style={{ marginTop: 0, marginBottom: "0.85rem" }}>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              onClick={() => setOpen(true)}
            >
              Nieuw bericht
            </button>
          </div>
          {toast ? <p className="crm-muted">{toast}</p> : null}
          {loading ? (
            <p className="crm-muted">Laden…</p>
          ) : messages.length === 0 ? (
            <p className="crm-muted">Nog geen berichten verstuurd.</p>
          ) : (
            <ul className="crm-message-list">
              {messages.map((m) => (
                <li key={m.id} className="crm-message-item">
                  <div className="crm-message-meta">
                    <strong>{m.subject}</strong>
                    <span className="crm-muted">
                      {formatDateTime(m.sentAt)} · {m.toEmail}
                    </span>
                  </div>
                  <pre className="crm-message-body">{m.body}</pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NewLeadMessageModal
        leadId={leadId}
        leadNaam={leadNaam}
        open={open}
        onClose={() => setOpen(false)}
        onSent={(msg) => {
          setMessages((prev) => [msg, ...prev]);
          setToast("Bericht verstuurd.");
        }}
      />
    </>
  );
}
