"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MANUAL_STATUSES, SALES_REPS, STATUS_LABELS } from "@/lib/constants";
import type { Lead } from "@/lib/mappers";
import type { MarketplaceListing } from "@/lib/marketplace";
import { formatEuro, formatDateTime, labelForStatus } from "@/lib/status";
import { PhotoGallery } from "@/components/marketplace/PhotoGallery";
import {
  FinanceCalcFields,
  useFinanceCalc,
} from "./FinanceCalcFields";
import { ShareToBuyerModal } from "./ShareToBuyerModal";

function statusBadgeClass(status: string) {
  if (status === "nieuw") return "crm-badge crm-badge-nieuw";
  if (status === "deal") return "crm-badge crm-badge-deal";
  if (status.startsWith("contact_")) return "crm-badge crm-badge-contact";
  if (
    status === "geen_contact" ||
    status === "geen_interesse" ||
    status === "verkeerd_telefoonnummer"
  ) {
    return "crm-badge crm-badge-dead";
  }
  return "crm-badge";
}

function PostcodeIcon() {
  return (
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function LeadDetailClient({
  initialLead,
  initialListing = null,
}: {
  initialLead: Lead;
  initialListing?: MarketplaceListing | null;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [listing, setListing] = useState<MarketplaceListing | null>(
    initialListing,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const finance = useFinanceCalc({
    inkoopprijs: lead.inkoopprijs,
    marge: lead.marge,
    nettoInkoopprijs: lead.nettoInkoopprijs,
  });
  const [straat, setStraat] = useState(lead.straat ?? "");
  const [huisnummer, setHuisnummer] = useState(lead.huisnummer ?? "");
  const [toevoeging, setToevoeging] = useState(lead.toevoeging ?? "");
  const [postcode, setPostcode] = useState(lead.postcode ?? "");
  const [woonplaats, setWoonplaats] = useState(lead.woonplaats ?? "");
  const [omschrijving, setOmschrijving] = useState(
    initialListing?.omschrijving ?? "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);

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
      finance.syncFromLead(data);
      setStraat(data.straat ?? "");
      setHuisnummer(data.huisnummer ?? "");
      setToevoeging(data.toevoeging ?? "");
      setPostcode(data.postcode ?? "");
      setWoonplaats(data.woonplaats ?? "");
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
    if (updated?.status === "geen_contact") {
      setMessage(
        "7 contactpogingen bereikt → status Geen contact. Lead verdwijnt uit actieve lijst.",
      );
    } else if (updated) {
      setMessage(
        `Contactpoging geregistreerd (${updated.contactAttempts}/7).`,
      );
    }
  }

  async function saveFinance() {
    const fin = finance.valuesForSave();
    await patch({
      inkoopprijs: fin.inkoopprijs,
      marge: fin.marge,
      nettoInkoopprijs: fin.nettoInkoopprijs,
    });
    setMessage("Inkoopprijs en marge opgeslagen.");
  }

  async function saveAddress() {
    await patch({
      straat: straat || null,
      huisnummer: huisnummer || null,
      toevoeging: toevoeging || null,
      postcode: postcode || null,
      woonplaats: woonplaats || null,
    });
    setMessage("Adres opgeslagen.");
  }

  async function lookupPostcode() {
    if (!postcode.trim() || !huisnummer.trim()) {
      setMessage("Vul postcode en huisnummer in voor de lookup.");
      return;
    }
    setLookupBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/postcode?postcode=${encodeURIComponent(postcode)}&number=${encodeURIComponent(huisnummer)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup mislukt");
      const nextStraat = data.street || "";
      const nextWoonplaats = data.city || "";
      const nextPostcode = data.zip_code || postcode;
      const nextHuisnummer = String(data.house_number || huisnummer);
      setStraat(nextStraat);
      setWoonplaats(nextWoonplaats);
      setPostcode(nextPostcode);
      setHuisnummer(nextHuisnummer);
      await patch({
        straat: nextStraat || null,
        huisnummer: nextHuisnummer || null,
        toevoeging: toevoeging || null,
        postcode: nextPostcode || null,
        woonplaats: nextWoonplaats || null,
      });
      setMessage("Adres opgehaald en opgeslagen via postcode API.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lookup mislukt");
    } finally {
      setLookupBusy(false);
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
            {lead.status === "deal" ? "Naar deal" : "Deal aanmaken"}
          </Link>
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
            <div className="crm-card-head">Leadgegevens & adres</div>
            <div className="crm-card-body">
              <div className="crm-fields" style={{ marginBottom: "1rem" }}>
                <div className="crm-field">
                  <label>Naam</label>
                  <div>{lead.naam}</div>
                </div>
                <div className="crm-field">
                  <label>E-mail</label>
                  <div>
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  </div>
                </div>
                <div className="crm-field">
                  <label>Telefoon</label>
                  <div>
                    <a href={`tel:${lead.telefoon}`}>{lead.telefoon}</a>
                  </div>
                </div>
                <div className="crm-field">
                  <label>Timing</label>
                  <div>{lead.timing}</div>
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

              <div className="crm-form">
                <div className="crm-postcode-row">
                  <label>
                    Postcode
                    <input
                      className="crm-input"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="1234AB"
                    />
                  </label>
                  <label>
                    Huisnr
                    <input
                      className="crm-input"
                      value={huisnummer}
                      onChange={(e) => setHuisnummer(e.target.value)}
                    />
                  </label>
                  <label>
                    Toev.
                    <input
                      className="crm-input"
                      value={toevoeging}
                      onChange={(e) => setToevoeging(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="crm-btn crm-btn-primary crm-postcode-btn"
                    title="Adres ophalen via postcode"
                    disabled={lookupBusy || busy}
                    onClick={lookupPostcode}
                  >
                    <PostcodeIcon />
                  </button>
                </div>
                <label>
                  Straat
                  <input
                    className="crm-input"
                    value={straat}
                    onChange={(e) => setStraat(e.target.value)}
                  />
                </label>
                <label>
                  Woonplaats
                  <input
                    className="crm-input"
                    value={woonplaats}
                    onChange={(e) => setWoonplaats(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="crm-btn"
                  disabled={busy}
                  onClick={saveAddress}
                >
                  Adres opslaan
                </button>
                <p className="crm-muted">
                  Vul postcode + huisnummer in en klik op het pin-icoon om
                  straat/woonplaats te vullen (nodig voor contract-PDF).
                </p>
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
              {lead.photos && lead.photos.length > 0 ? (
                <PhotoGallery
                  photos={lead.photos}
                  gridClassName="crm-photo-grid"
                  thumbClassName="crm-photo-thumb"
                />
              ) : (
                <p className="crm-muted">Nog geen foto&apos;s geüpload.</p>
              )}
            </div>
          </div>

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
            <div className="crm-card-head">Deal & contract</div>
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
                <>
                  <p className="crm-muted">
                    Open de deal-pagina om alle contractgegevens, handelaar,
                    bemiddelaar en prijzen in te vullen.
                  </p>
                  <div className="crm-actions">
                    <Link
                      href={`/admin/leads/${lead.id}/deal`}
                      className="crm-btn crm-btn-primary"
                    >
                      Deal aanmaken
                    </Link>
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
              <p>
                Huidige status:{" "}
                <span className={statusBadgeClass(lead.status)}>
                  {labelForStatus(lead.status, lead.contactAttempts)}
                </span>
              </p>
              <p className="crm-muted">
                Contactpogingen: {Math.min(lead.contactAttempts, 7)}/7. Bij 7
                gaat de lead naar &quot;Geen contact&quot;.
              </p>
              <div className="crm-actions">
                <button
                  type="button"
                  className="crm-btn crm-btn-primary"
                  disabled={busy || lead.contactAttempts >= 7}
                  onClick={contactAttempt}
                >
                  + Contactpoging
                </button>
              </div>
              <div className="crm-actions">
                {MANUAL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="crm-btn"
                    disabled={busy}
                    onClick={() => setStatus(s)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-head">Financieel (snel)</div>
            <div className="crm-card-body">
              <FinanceCalcFields finance={finance} />
              <div style={{ marginTop: "0.85rem" }}>
                <button
                  type="button"
                  className="crm-btn crm-btn-primary"
                  disabled={busy}
                  onClick={saveFinance}
                >
                  Opslaan
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
              {SALES_REPS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {lead.verkoopmedewerker &&
                !(SALES_REPS as readonly string[]).includes(
                  lead.verkoopmedewerker,
                ) && (
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
