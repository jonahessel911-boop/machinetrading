"use client";

import { useEffect, useState } from "react";
import type { LeadNote } from "@/lib/lead-notes";
import { formatDateTime } from "@/lib/status";

export function LeadNotesCard({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/leads/${leadId}/notes`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Laden mislukt");
        if (!cancelled) setNotes(data.notes ?? []);
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function save() {
    const text = body.trim();
    if (!text) {
      setError("Schrijf eerst een notitie");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setNotes((prev) => [data.note as LeadNote, ...prev]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function remove(noteId: string) {
    if (!confirm("Deze interne notitie verwijderen?")) return;
    setDeletingId(noteId);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/leads/${leadId}/notes?noteId=${encodeURIComponent(noteId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="crm-card">
      <div className="crm-card-head">
        Interne notities ({notes.length})
      </div>
      <div className="crm-card-body">
        <p className="crm-muted" style={{ marginTop: 0 }}>
          Alleen zichtbaar voor medewerkers — niet in het klantportaal en niet
          per e-mail.
        </p>
        <label className="crm-modal-label">
          Nieuwe notitie
          <textarea
            className="crm-input"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
            placeholder="Gesprek noteren, afspraak, aandachtspunten…"
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
        </label>
        {error ? <p className="crm-form-error">{error}</p> : null}
        <div className="crm-actions" style={{ marginTop: "0.65rem" }}>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            disabled={busy}
            onClick={save}
          >
            {busy ? "Opslaan…" : "Notitie opslaan"}
          </button>
        </div>

        {loading ? (
          <p className="crm-muted" style={{ marginTop: "1rem" }}>
            Laden…
          </p>
        ) : notes.length === 0 ? (
          <p className="crm-muted" style={{ marginTop: "1rem" }}>
            Nog geen interne notities.
          </p>
        ) : (
          <ul className="crm-message-list" style={{ marginTop: "1rem" }}>
            {notes.map((n) => (
              <li key={n.id} className="crm-message-item">
                <div className="crm-message-meta">
                  <strong>{n.authorNaam}</strong>
                  <span className="crm-muted">
                    {formatDateTime(n.createdAt)}
                  </span>
                </div>
                <pre className="crm-message-body">{n.body}</pre>
                <div className="crm-actions" style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="crm-btn"
                    disabled={deletingId === n.id}
                    onClick={() => remove(n.id)}
                  >
                    {deletingId === n.id ? "Verwijderen…" : "Verwijderen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
