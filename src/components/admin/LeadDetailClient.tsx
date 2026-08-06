"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SELECTABLE_LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { Lead } from "@/lib/mappers";
import type { MarketplaceListing } from "@/lib/marketplace";
import type { LeadBid } from "@/lib/lead-bids";
import {
  formatEuro,
  formatDateTime,
  labelForStatus,
  leadStatusBadgeClass,
} from "@/lib/status";
import { PhotoGallery } from "@/components/marketplace/PhotoGallery";
import { ImageEraseEditor } from "./ImageEraseEditor";
import { ShareToBuyerModal } from "./ShareToBuyerModal";
import { LeadMessagesCard } from "./LeadMessagesCard";
import { LeadNotesCard } from "./LeadNotesCard";

function statusBadgeClass(status: string) {
  return leadStatusBadgeClass(status);
}

export function LeadDetailClient({
  initialLead,
  initialListing = null,
  initialBids = [],
  salesReps = ["Jona"],
}: {
  initialLead: Lead;
  initialListing?: MarketplaceListing | null;
  initialBids?: LeadBid[];
  salesReps?: string[];
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [listing, setListing] = useState<MarketplaceListing | null>(
    initialListing,
  );
  const [bids] = useState(initialBids);
  const [shareOpen, setShareOpen] = useState(false);
  const [editPhoto, setEditPhoto] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [omschrijving, setOmschrijving] = useState(
    initialLead.omschrijving ?? initialListing?.omschrijving ?? "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(initialLead.email);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update mislukt");
      setLead(data);
      router.refresh();
      return data;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function contactAttempt() {
    const updated = await patch({ action: "contact" });
    if (!updated) return;
    if (updated.status === "geen_interesse" && updated.contactAttempts >= 7) {
      setMessage(
        "7 contactpogingen bereikt → status Geen interesse.",
      );
    } else {
      setMessage(
        `Contactpoging geregistreerd (${updated.contactAttempts}/7). Status blijft ${labelForStatus(updated.status)}.`,
      );
    }
  }

  async function requestPhotos() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/request-photos`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mail versturen mislukt");
      setMessage(
        `Foto-verzoek gestuurd naar ${data.to || lead.email}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail() {
    const next = emailDraft.trim();
    if (!next || !next.includes("@")) {
      setMessage("Vul een geldig e-mailadres in.");
      return;
    }
    if (next === lead.email) {
      setEditingEmail(false);
      return;
    }
    const updated = await patch({ email: next });
    if (updated) {
      setEmailDraft(updated.email);
      setEditingEmail(false);
      setMessage("E-mailadres opgeslagen.");
    }
  }

  async function deleteLead() {
    if (
      !confirm(
        `Lead "${lead.naam}" definitief verwijderen? Foto's, contracten en marketplace-listings gaan mee.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      router.push("/admin/leads");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    await patch({ status });
    setMessage(`Status gewijzigd naar ${STATUS_LABELS[status] ?? status}`);
  }

  async function publishToMarketplace() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          leadId: lead.id,
          omschrijving: omschrijving || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publiceren mislukt");
      setListing(data);
      setMessage(
        `Gepubliceerd op marketplace (7 dagen). Link: ${data.publicUrl}`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function republishListing() {
    if (!listing) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "republish",
          listingId: listing.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hernieuwen mislukt");
      setListing(data);
      setMessage("Opnieuw 7 dagen op de marketplace gezet.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  async function unpublishListing() {
    if (!listing) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unpublish",
          listingId: listing.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Intrekken mislukt");
      setListing(data);
      setMessage("Van marketplace gehaald.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="crm-page-header">
        <div>
          <p className="crm-subtitle">
            <Link href="/admin/leads">Leads</Link> / {lead.naam}
          </p>
          <h1 className="crm-title">{lead.naam}</h1>
        </div>
        <div className="crm-actions" style={{ margin: 0 }}>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            disabled={busy || listing?.isLive}
            onClick={publishToMarketplace}
            title={
              listing?.isLive
                ? "Staat al op de marketplace"
                : "Publish to marketplace"
            }
          >
            Publish to marketplace
          </button>
          <button
            type="button"
            className="crm-btn"
            disabled={busy}
            onClick={() => setShareOpen(true)}
          >
            Stuur naar handelaar
          </button>
          <Link
            href={`/admin/leads/${lead.id}/deal`}
            className="crm-btn"
          >
            Contract
          </Link>
          <a
            className="crm-btn"
            href={`/api/admin/leads/${lead.id}/portal`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open klantportaal zoals de lead het ziet"
          >
            Bekijk portaal
          </a>
          <button
            type="button"
            className="crm-btn"
            disabled={busy}
            onClick={requestPhotos}
            title="Stuur de klant een mail om foto's te uploaden"
          >
            Vraag om foto&apos;s (mail)
          </button>
          <a className="crm-btn" href={`tel:${lead.telefoon}`}>
            Bellen
          </a>
          <a className="crm-btn" href={`mailto:${lead.email}`}>
            E-mail
          </a>
          <button
            type="button"
            className="crm-btn"
            disabled={busy || lead.contactAttempts >= 7}
            onClick={contactAttempt}
          >
            Contactpoging ({Math.min(lead.contactAttempts, 7)}/7)
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-danger"
            disabled={busy}
            onClick={deleteLead}
            title="Lead verwijderen"
            aria-label="Lead verwijderen"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Verwijderen
          </button>
        </div>
      </div>

      {message && <div className="crm-toast">{message}</div>}

      <ShareToBuyerModal
        leadId={lead.id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onDone={(msg) => {
          setMessage(msg);
          router.refresh();
          fetch(`/api/admin/marketplace?leadId=${lead.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data) setListing(data);
            })
            .catch(() => undefined);
        }}
      />

      {editPhoto && (
        <ImageEraseEditor
          photoId={editPhoto.id}
          leadId={lead.id}
          onClose={() => setEditPhoto(null)}
          onSaved={(photo) => {
            // Alleen lokale preview — niet persistent / niet naar server
            setLead((prev) => ({
              ...prev,
              photos: (prev.photos ?? []).map((p) =>
                p.id === photo.id ? { ...p, url: photo.url } : p,
              ),
            }));
            setMessage("Preview klaar — nog niet live opgeslagen.");
          }}
        />
      )}

      <div className="crm-highlight">
        <div className="crm-highlight-main">
          <h1>
            {lead.merk} {lead.model}
          </h1>
          <span className={statusBadgeClass(lead.status)}>
            {labelForStatus(lead.status, lead.contactAttempts)}
          </span>
        </div>
        {lead.status === "deal" && (
          <div
            className="crm-sold-stamp"
            aria-label={
              lead.marge != null
                ? `Sold, marge ${formatEuro(lead.marge)}`
                : "Sold"
            }
          >
            <span className="crm-sold-stamp-title">SOLD</span>
            {lead.marge != null && (
              <span className="crm-sold-stamp-marge">
                {formatEuro(lead.marge)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="crm-two">
        <div>
          <div className="crm-card">
            <div className="crm-card-head">Leadgegevens</div>
            <div className="crm-card-body">
              <div className="crm-fields">
                <div className="crm-field">
                  <label>Naam</label>
                  <div>{lead.naam}</div>
                </div>
                <div className="crm-field">
                  <label>E-mail</label>
                  {editingEmail ? (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      <input
                        className="crm-input"
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        autoComplete="email"
                        disabled={busy}
                      />
                      <div className="crm-actions" style={{ margin: 0 }}>
                        <button
                          type="button"
                          className="crm-btn crm-btn-primary"
                          disabled={busy}
                          onClick={saveEmail}
                        >
                          Opslaan
                        </button>
                        <button
                          type="button"
                          className="crm-btn"
                          disabled={busy}
                          onClick={() => {
                            setEmailDraft(lead.email);
                            setEditingEmail(false);
                          }}
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                      <button
                        type="button"
                        className="crm-btn"
                        style={{ padding: "0.25rem 0.55rem", fontSize: "0.8rem" }}
                        disabled={busy}
                        onClick={() => {
                          setEmailDraft(lead.email);
                          setEditingEmail(true);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                <div className="crm-field">
                  <label>Telefoon</label>
                  <div>
                    <a href={`tel:${lead.telefoon}`}>{lead.telefoon}</a>
                  </div>
                </div>
                <div className="crm-field">
                  <label>Woonplaats</label>
                  <div>{lead.woonplaats || "—"}</div>
                </div>
                <div className="crm-field">
                  <label>Timing</label>
                  <div>{lead.timing}</div>
                </div>
                <div className="crm-field">
                  <label>Richtprijs</label>
                  <div>
                    {lead.richtprijs != null
                      ? formatEuro(lead.richtprijs)
                      : "—"}
                  </div>
                </div>
                <div className="crm-field">
                  <label>Aangemeld</label>
                  <div>{formatDateTime(lead.createdAt)}</div>
                </div>
                <div className="crm-field">
                  <label>Koper</label>
                  <div>{lead.buyer?.bedrijf ?? "Nog niet gekoppeld"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-head">Heftruck</div>
            <div className="crm-card-body">
              <div className="crm-fields">
                <div className="crm-field">
                  <label>Merk</label>
                  <div>{lead.merk}</div>
                </div>
                <div className="crm-field">
                  <label>Model</label>
                  <div>{lead.model ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-head">
              Foto&apos;s ({lead.photos?.length ?? 0})
            </div>
            <div className="crm-card-body">
              <div className="crm-actions" style={{ marginTop: 0, marginBottom: "0.85rem" }}>
                <button
                  type="button"
                  className="crm-btn crm-btn-primary"
                  disabled={busy}
                  onClick={requestPhotos}
                  title="Stuurt een mail naar de klant met knop naar het portaal"
                >
                  Vraag om foto&apos;s (mail)
                </button>
              </div>
              {lead.photos && lead.photos.length > 0 ? (
                <>
                  <p className="crm-muted" style={{ marginTop: 0 }}>
                    Sleep foto&apos;s om de volgorde te wijzigen (selectie &amp;
                    marketplace). Open → bewerken, of × om te verwijderen.
                  </p>
                  <PhotoGallery
                    photos={lead.photos}
                    gridClassName="crm-photo-grid"
                    thumbClassName="crm-photo-thumb"
                    editable
                    sortable
                    onEditPhoto={(photo) =>
                      setEditPhoto({ id: photo.id, url: photo.url })
                    }
                    onReorder={async (orderedIds) => {
                      const byId = new Map(
                        (lead.photos ?? []).map((p) => [p.id, p]),
                      );
                      const next = orderedIds
                        .map((id, i) => {
                          const p = byId.get(id);
                          return p ? { ...p, sortOrder: i } : null;
                        })
                        .filter(Boolean) as NonNullable<typeof lead.photos>;
                      setLead((prev) => ({ ...prev, photos: next }));
                      const res = await fetch(
                        `/api/admin/leads/${lead.id}/photos/reorder`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ photoIds: orderedIds }),
                        },
                      );
                      const data = (await res.json().catch(() => ({}))) as {
                        error?: string;
                        photos?: typeof next;
                      };
                      if (!res.ok) {
                        throw new Error(data.error || "Volgorde opslaan mislukt");
                      }
                      if (data.photos) {
                        setLead((prev) => ({ ...prev, photos: data.photos }));
                      }
                      setMessage("Fotovolgorde opgeslagen.");
                    }}
                    onDeletePhoto={async (photo) => {
                      const res = await fetch(
                        `/api/admin/leads/${lead.id}/photos/${photo.id}`,
                        { method: "DELETE" },
                      );
                      const data = (await res.json().catch(() => ({}))) as {
                        error?: string;
                      };
                      if (!res.ok) {
                        throw new Error(data.error || "Verwijderen mislukt");
                      }
                      setLead((prev) => ({
                        ...prev,
                        photos: (prev.photos ?? []).filter(
                          (p) => p.id !== photo.id,
                        ),
                      }));
                      setMessage("Foto verwijderd.");
                    }}
                  />
                </>
              ) : (
                <p className="crm-muted">Nog geen foto&apos;s geüpload.</p>
              )}
            </div>
          </div>

          <LeadNotesCard leadId={lead.id} />

          <LeadMessagesCard leadId={lead.id} leadNaam={lead.naam} />

          <div className="crm-card">
            <div className="crm-card-head">
              Contracten ({lead.contracts?.length ?? 0})
            </div>
            <div className="crm-card-body">
              {lead.contracts?.length ? (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Koper</th>
                        <th>Verstuurd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lead.contracts.map((c) => (
                        <tr key={c.id}>
                          <td>{c.status}</td>
                          <td>{c.buyer?.bedrijf ?? "—"}</td>
                          <td>
                            {c.sentAt ? formatDateTime(c.sentAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="crm-muted">Nog geen contracten.</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="crm-card">
            <div className="crm-card-head">Contract</div>
            <div className="crm-card-body">
              {lead.status === "deal" ? (
                <>
                  <div
                    className="crm-table-wrap"
                    style={{ border: "none", boxShadow: "none", margin: 0 }}
                  >
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Machine</th>
                          <th>Koper</th>
                          <th>Datum</th>
                          <th>Inkoop</th>
                          <th>Marge</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            {lead.merk} {lead.model}
                          </td>
                          <td>{lead.buyer?.bedrijf ?? "—"}</td>
                          <td>{lead.dealDatum ?? "—"}</td>
                          <td>{formatEuro(lead.inkoopprijs)}</td>
                          <td>{formatEuro(lead.marge)}</td>
                          <td>
                            <Link
                              href={`/admin/leads/${lead.id}/deal`}
                              className="crm-icon-btn"
                              title="Naar deal"
                              aria-label="Naar deal"
                            >
                              ✎
                            </Link>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="crm-actions" style={{ marginTop: "0.75rem" }}>
                    <Link
                      href={`/admin/leads/${lead.id}/deal`}
                      className="crm-btn crm-btn-primary"
                    >
                      Naar deal
                    </Link>
                  </div>
                </>
              ) : (
                <div className="crm-actions">
                  <Link
                    href={`/admin/leads/${lead.id}/deal`}
                    className="crm-btn crm-btn-contract"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="16" y2="17" />
                      <line x1="8" y1="9" x2="10" y2="9" />
                    </svg>
                    Contract
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-head">Handelaarsbiedingen</div>
            <div className="crm-card-body">
              {bids.length === 0 ? (
                <p className="crm-muted" style={{ margin: 0 }}>
                  Nog geen biedingen via selectieportaal.
                </p>
              ) : (
                <>
                  <p style={{ margin: "0 0 0.75rem" }}>
                    Hoogste bod:{" "}
                    <strong style={{ fontSize: "1.25rem" }}>
                      {formatEuro(bids[0].bedrag)}
                    </strong>
                    <span className="crm-muted">
                      {" "}
                      · {bids[0].bidderBedrijf || bids[0].bidderNaam}
                    </span>
                  </p>
                  <div className="crm-table-wrap">
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Bod</th>
                          <th>Handelaar</th>
                          <th>Contact</th>
                          <th>Datum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bids.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <strong>{formatEuro(b.bedrag)}</strong>
                            </td>
                            <td>
                              {b.bidderBedrijf || b.bidderNaam}
                              {b.bidderBedrijf ? (
                                <div className="crm-muted">{b.bidderNaam}</div>
                              ) : null}
                            </td>
                            <td>
                              <div>{b.bidderEmail}</div>
                              {b.bidderTelefoon ? (
                                <div className="crm-muted">
                                  {b.bidderTelefoon}
                                </div>
                              ) : null}
                            </td>
                            <td>{formatDateTime(b.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-head">Marketplace</div>
            <div className="crm-card-body">
              <div className="crm-form">
                <label>
                  Omschrijving (optioneel)
                  <textarea
                    className="crm-input"
                    rows={3}
                    value={omschrijving}
                    onChange={(e) => setOmschrijving(e.target.value)}
                    onBlur={async () => {
                      try {
                        await fetch(`/api/admin/leads/${lead.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ omschrijving }),
                        });
                      } catch {
                        /* stil — volgende publish synct alsnog */
                      }
                    }}
                    placeholder="Korte toelichting voor handelaren…"
                  />
                </label>
                <div className="crm-actions">
                  <button
                    type="button"
                    className="crm-btn crm-btn-primary"
                    disabled={busy || listing?.isLive}
                    onClick={publishToMarketplace}
                  >
                    Publish to marketplace
                  </button>
                  <button
                    type="button"
                    className="crm-btn"
                    disabled={busy}
                    onClick={() => setShareOpen(true)}
                  >
                    Stuur naar handelaar
                  </button>
                </div>
                {listing && (
                  <div className="crm-fields" style={{ marginTop: "0.5rem" }}>
                    <div className="crm-field">
                      <label>Status</label>
                      <div>
                        <span
                          className={
                            listing.isLive
                              ? "crm-badge crm-badge-deal"
                              : "crm-badge crm-badge-dead"
                          }
                        >
                          {listing.isLive ? "Actief" : listing.status}
                        </span>
                      </div>
                    </div>
                    <div className="crm-field">
                      <label>Unieke link</label>
                      <div>
                        <Link href={listing.publicUrl!} target="_blank">
                          {listing.publicUrl}
                        </Link>
                      </div>
                    </div>
                    <div className="crm-field">
                      <label>Eindigt</label>
                      <div>{formatDateTime(listing.endsAt)}</div>
                    </div>
                    <div className="crm-field">
                      <label>Biedingen</label>
                      <div>
                        {listing.bidCount ?? 0}
                        {listing.highestBid != null
                          ? ` · hoogste ${formatEuro(listing.highestBid)}`
                          : ""}
                      </div>
                    </div>
                    <div className="crm-actions">
                      {!listing.isLive && (
                        <button
                          type="button"
                          className="crm-btn crm-btn-primary"
                          disabled={busy}
                          onClick={republishListing}
                        >
                          Opnieuw 7 dagen publiceren
                        </button>
                      )}
                      {listing.isLive && (
                        <button
                          type="button"
                          className="crm-btn"
                          disabled={busy}
                          onClick={unpublishListing}
                        >
                          Van marketplace halen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-head">Status & contact</div>
            <div className="crm-card-body">
              <label className="crm-modal-label">
                Status
                <select
                  className="crm-select"
                  value={lead.status}
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next && next !== lead.status) setStatus(next);
                  }}
                >
                  {!SELECTABLE_LEAD_STATUSES.includes(
                    lead.status as (typeof SELECTABLE_LEAD_STATUSES)[number],
                  ) ? (
                    <option value={lead.status}>
                      {labelForStatus(lead.status, lead.contactAttempts)}{" "}
                      (oud)
                    </option>
                  ) : null}
                  {SELECTABLE_LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <p style={{ marginTop: "0.75rem" }}>
                Huidige status:{" "}
                <span className={statusBadgeClass(lead.status)}>
                  {labelForStatus(lead.status, lead.contactAttempts)}
                </span>
              </p>
              <p className="crm-muted">
                Contactpogingen (eerste belrondes):{" "}
                {Math.min(lead.contactAttempts, 7)}/7 — dit is geen status.
                Status blijft Nieuw tot je die zelf wijzigt; na 7 pogingen wordt
                het automatisch Geen interesse.
              </p>
              <div className="crm-actions">
                <button
                  type="button"
                  className="crm-btn"
                  disabled={busy || lead.contactAttempts >= 7}
                  onClick={contactAttempt}
                >
                  + Contactpoging
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-card" style={{ marginTop: "0.85rem" }}>
        <div className="crm-card-head">Verkoopmedewerker</div>
        <div className="crm-card-body">
          <label className="crm-sold-rep-label crm-sold-rep-label--page">
            <span>Gekoppeld aan deze lead</span>
            <select
              className="crm-select crm-sold-rep-select"
              value={lead.verkoopmedewerker ?? ""}
              disabled={busy}
              onChange={async (e) => {
                const value = e.target.value || null;
                const updated = await patch({ verkoopmedewerker: value });
                if (updated) {
                  setMessage(
                    value
                      ? `Verkoopmedewerker: ${value}`
                      : "Verkoopmedewerker ontkoppeld",
                  );
                }
              }}
            >
              <option value="">— Kies medewerker —</option>
              {salesReps.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {lead.verkoopmedewerker &&
                !salesReps.includes(lead.verkoopmedewerker) && (
                  <option value={lead.verkoopmedewerker}>
                    {lead.verkoopmedewerker}
                  </option>
                )}
            </select>
          </label>
        </div>
      </div>
    </>
  );
}
