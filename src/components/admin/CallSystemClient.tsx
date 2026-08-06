"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CallTaxatiePanel } from "@/components/admin/CallTaxatiePanel";
import { NewLeadMessageModal } from "@/components/admin/LeadMessagesCard";
import { PhotoGallery } from "@/components/marketplace/PhotoGallery";
import type { LeadNote } from "@/lib/lead-notes";
import type { Lead } from "@/lib/mappers";
import { formatAddress } from "@/lib/mappers";
import {
  formatDateTime,
  formatEuro,
  vehicleLabel,
} from "@/lib/status";

type CallResult =
  | "geen_contact"
  | "afwachten_fotos"
  | "koper_zoeken"
  | "geen_interesse"
  | "onrealistische_prijs";

const RESULTS: {
  id: CallResult;
  label: string;
  hint: string;
}[] = [
  {
    id: "geen_contact",
    label: "Geen contact",
    hint: "Belpoging bijhouden · na 7× automatisch Geen interesse",
  },
  {
    id: "afwachten_fotos",
    label: "Afwachten foto's",
    hint: "Status zetten + fotoverzoek-mail sturen",
  },
  {
    id: "koper_zoeken",
    label: "Koper zoeken",
    hint: "Lead klaar · we gaan dealers benaderen",
  },
  {
    id: "geen_interesse",
    label: "Geen interesse",
    hint: "Lead afsluiten",
  },
  {
    id: "onrealistische_prijs",
    label: "Onrealistische prijs",
    hint: "Vraagprijs te hoog · lead afsluiten",
  },
];

export function CallSystemClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [queue, setQueue] = useState(initialLeads);
  const [index, setIndex] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [noteBusy, setNoteBusy] = useState(false);

  const lead = queue[index] ?? null;
  const remaining = queue.length;
  const leadId = lead?.id ?? null;

  useEffect(() => {
    setNoteBody("");
    setNotes([]);
    if (!leadId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/leads/${leadId}/notes`);
        const data = await res.json();
        if (!cancelled && res.ok) setNotes(data.notes ?? []);
      } catch {
        if (!cancelled) setNotes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const lastContact = useMemo(() => {
    if (!lead?.contactAttemptTimes?.length) return null;
    const times = [...lead.contactAttemptTimes].sort();
    return times[times.length - 1] ?? null;
  }, [lead]);

  function advanceQueue(removeId: string) {
    setQueue((prev) => {
      const next = prev.filter((l) => l.id !== removeId);
      setIndex(0);
      return next;
    });
    setResultOpen(false);
    setMessageOpen(false);
  }

  async function requestPhotosMail() {
    if (!lead || actionBusy) return;
    setActionBusy(true);
    setToast("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/request-photos`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; to?: string };
      if (!res.ok) throw new Error(data.error || "Mail versturen mislukt");
      setToast(`Fotoverzoek gestuurd naar ${data.to || lead.email}.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Fout");
    } finally {
      setActionBusy(false);
    }
  }

  async function saveNote() {
    if (!lead || noteBusy) return;
    const text = noteBody.trim();
    if (!text) {
      setToast("Schrijf eerst een notitie.");
      return;
    }
    setNoteBusy(true);
    setToast("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Notitie opslaan mislukt");
      setNotes((prev) => [data.note as LeadNote, ...prev]);
      setNoteBody("");
      setToast("Interne notitie opgeslagen.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Fout");
    } finally {
      setNoteBusy(false);
    }
  }

  async function submitResult(result: CallResult) {
    if (!lead || busy) return;
    setBusy(true);
    setToast("");
    const current = lead;
    try {
      if (result === "geen_contact") {
        const res = await fetch(`/api/admin/leads/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "contact" }),
        });
        const data = (await res.json()) as Lead & { error?: string };
        if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
        if (data.status === "geen_interesse") {
          setToast(
            `${current.naam}: 7× geen contact → Geen interesse. Volgende lead.`,
          );
        } else {
          setToast(
            `${current.naam}: geen contact (${data.contactAttempts}/7). Volgende lead.`,
          );
        }
      } else if (result === "afwachten_fotos") {
        const [statusRes, mailRes] = await Promise.all([
          fetch(`/api/admin/leads/${current.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "afwachten_fotos" }),
          }),
          fetch(`/api/admin/leads/${current.id}/request-photos`, {
            method: "POST",
          }),
        ]);
        const statusData = (await statusRes.json()) as { error?: string };
        if (!statusRes.ok) {
          throw new Error(statusData.error || "Status wijzigen mislukt");
        }
        const mailData = (await mailRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setToast(
          mailRes.ok
            ? `${current.naam}: Afwachten foto's + mail verstuurd.`
            : `${current.naam}: Afwachten foto's (mail mislukt: ${mailData.error || "onbekend"}).`,
        );
      } else if (result === "koper_zoeken") {
        const res = await fetch(`/api/admin/leads/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "koper_zoeken" }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
        setToast(`${current.naam}: Koper zoeken.`);
      } else {
        const status =
          result === "onrealistische_prijs"
            ? "onrealistische_prijs"
            : "geen_interesse";
        const res = await fetch(`/api/admin/leads/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
        setToast(
          status === "onrealistische_prijs"
            ? `${current.naam}: Onrealistische prijs.`
            : `${current.naam}: Geen interesse.`,
        );
      }

      advanceQueue(current.id);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  if (!lead) {
    return (
      <div className="call-empty">
        <h1 className="crm-title">Bel systeem</h1>
        <p className="crm-muted">
          Geen leads met status <strong>Nieuw</strong> in de wachtrij.
        </p>
        {toast ? <p className="call-toast">{toast}</p> : null}
        <Link href="/admin/leads" className="crm-btn">
          Naar leads
        </Link>
      </div>
    );
  }

  const title = vehicleLabel(lead.merk, lead.model);
  const telHref = lead.telefoon.replace(/\s/g, "");

  return (
    <div className="call-system">
      <div className="call-top">
        <div>
          <h1 className="crm-title" style={{ marginBottom: "0.25rem" }}>
            Bel systeem
          </h1>
          <p className="crm-muted" style={{ margin: 0 }}>
            {remaining} in wachtrij · status Nieuw · minste belpogingen eerst
          </p>
        </div>
        <div className="call-top-actions">
          <a
            className="crm-btn crm-btn-primary call-btn-call"
            href={`tel:${telHref}`}
          >
            Bel {lead.telefoon}
          </a>
          <button
            type="button"
            className="crm-btn crm-btn-primary call-btn-next"
            disabled={busy}
            onClick={() => setResultOpen(true)}
          >
            Volgende
          </button>
        </div>
      </div>

      {toast ? <p className="call-toast">{toast}</p> : null}

      <div className="call-workspace">
      <article className="call-card">
        <header className="call-card-head">
          <div>
            <p className="call-eyebrow">
              Belpogingen {Math.min(lead.contactAttempts, 7)}/7
              {lastContact
                ? ` · laatst ${formatDateTime(lastContact)}`
                : " · nog niet gebeld"}
            </p>
            <h2 className="call-name">{lead.naam}</h2>
            <p className="call-machine">{title}</p>
          </div>
          <Link
            href={`/admin/leads/${lead.id}`}
            className="crm-btn"
            target="_blank"
          >
            Open lead
          </Link>
        </header>

        <div className="call-grid">
          <div className="call-field">
            <span>Telefoon</span>
            <a href={`tel:${telHref}`}>{lead.telefoon}</a>
          </div>
          <div className="call-field">
            <span>E-mail</span>
            <a href={`mailto:${lead.email}`}>{lead.email}</a>
          </div>
          <div className="call-field">
            <span>Timing</span>
            <strong>{lead.timing || "—"}</strong>
          </div>
          <div className="call-field">
            <span>Richtprijs</span>
            <strong>
              {lead.richtprijs != null ? formatEuro(lead.richtprijs) : "—"}
            </strong>
          </div>
          <div className="call-field">
            <span>Locatie</span>
            <strong>{formatAddress(lead)}</strong>
          </div>
          <div className="call-field">
            <span>Aangemeld</span>
            <strong>{formatDateTime(lead.createdAt)}</strong>
          </div>
          {lead.bedrijfsnaam ? (
            <div className="call-field">
              <span>Bedrijf</span>
              <strong>{lead.bedrijfsnaam}</strong>
            </div>
          ) : null}
          {lead.highestBid != null ? (
            <div className="call-field">
              <span>Hoogste bod</span>
              <strong>{formatEuro(lead.highestBid)}</strong>
            </div>
          ) : null}
        </div>

        {lead.omschrijving ? (
          <div className="call-block">
            <h3>Omschrijving</h3>
            <p className="call-omschrijving">{lead.omschrijving}</p>
          </div>
        ) : null}

        <div className="call-block">
          <h3>Foto&apos;s ({lead.photos?.length ?? 0})</h3>
          {lead.photos && lead.photos.length > 0 ? (
            <PhotoGallery
              photos={lead.photos}
              gridClassName="crm-photo-grid"
              thumbClassName="crm-photo-thumb"
            />
          ) : (
            <p className="crm-muted" style={{ margin: 0 }}>
              Nog geen foto&apos;s.
            </p>
          )}
        </div>

        <div className="call-block call-actions-block">
          <h3>Snelle acties</h3>
          <div className="call-quick-actions">
            <button
              type="button"
              className="crm-btn"
              disabled={actionBusy || busy}
              onClick={() => void requestPhotosMail()}
            >
              {actionBusy ? "Bezig…" : "Vraag om foto's (mail)"}
            </button>
            <button
              type="button"
              className="crm-btn"
              disabled={actionBusy || busy}
              onClick={() => setMessageOpen(true)}
            >
              Bericht (mail)
            </button>
          </div>
        </div>

        <div className="call-block">
          <h3>Interne notitie</h3>
          <p className="crm-muted" style={{ marginTop: 0 }}>
            Alleen voor medewerkers — niet zichtbaar voor de lead.
          </p>
          <textarea
            className="crm-input call-note-input"
            rows={3}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            disabled={noteBusy}
            placeholder="Gesprek noteren, afspraak, aandachtspunten…"
          />
          <div className="call-note-actions">
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={noteBusy || !noteBody.trim()}
              onClick={() => void saveNote()}
            >
              {noteBusy ? "Opslaan…" : "Notitie opslaan"}
            </button>
          </div>
          {notes.length > 0 ? (
            <ul className="call-notes-list">
              {notes.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <div className="call-note-meta">
                    <strong>{n.authorNaam}</strong>
                    <span>{formatDateTime(n.createdAt)}</span>
                  </div>
                  <pre>{n.body}</pre>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="call-footer-actions">
          <a className="crm-btn crm-btn-primary" href={`tel:${telHref}`}>
            Bellen
          </a>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            disabled={busy}
            onClick={() => setResultOpen(true)}
          >
            Volgende
          </button>
        </div>
      </article>

      <aside className="call-side">
        <CallTaxatiePanel lead={lead} />
      </aside>
      </div>

      <NewLeadMessageModal
        leadId={lead.id}
        leadNaam={lead.naam}
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        onSent={() => setToast(`Bericht verstuurd naar ${lead.email}.`)}
      />

      {resultOpen ? (
        <div
          className="call-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!busy) setResultOpen(false);
          }}
        >
          <div
            className="call-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-result-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="call-result-title">Resultaat gesprek</h2>
            <p className="crm-muted">
              {lead.naam} · {title}
            </p>
            <div className="call-result-list">
              {RESULTS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="call-result-btn"
                  disabled={busy}
                  onClick={() => void submitResult(r.id)}
                >
                  <strong>{r.label}</strong>
                  <span>{r.hint}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="crm-btn"
              disabled={busy}
              onClick={() => setResultOpen(false)}
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
