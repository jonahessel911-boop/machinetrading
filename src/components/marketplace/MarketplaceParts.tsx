"use client";

import Link from "next/link";
import { useState } from "react";
import type { MarketplaceListing } from "@/lib/marketplace";
import { listingTitle } from "@/lib/marketplace";
import { formatEuro } from "@/lib/status";
import { AuctionTimer } from "./AuctionTimer";

export function BidForm({
  slug,
  isLive,
  highestBid,
  onBid,
}: {
  slug: string;
  isLive: boolean;
  highestBid?: number | null;
  onBid: (listing: MarketplaceListing) => void;
}) {
  const [bedrag, setBedrag] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!isLive) {
    return (
      <div className="crm-card">
        <div className="crm-card-head">Veiling gesloten</div>
        <div className="crm-card-body">
          <p className="crm-muted">
            Deze veiling is niet meer actief. Je kunt geen bod meer plaatsen.
          </p>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          bedrag: Number(bedrag),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bod mislukt");
      onBid(data);
      setMessage("Bod geplaatst!");
      setBedrag("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-card">
      <div className="crm-card-head">Plaats een bod</div>
      <div className="crm-card-body">
        {highestBid != null && (
          <p className="crm-muted" style={{ marginBottom: "0.75rem" }}>
            Huidig hoogste bod: <strong>{formatEuro(highestBid)}</strong>
          </p>
        )}
        <form className="crm-form" onSubmit={submit}>
          <label>
            Bod (€)
            <input
              className="crm-input"
              type="number"
              min={1}
              required
              value={bedrag}
              onChange={(e) => setBedrag(e.target.value)}
              placeholder={
                highestBid != null
                  ? `Hoger dan ${highestBid}`
                  : "Jouw bod"
              }
            />
          </label>
          {message && <p className="crm-toast">{message}</p>}
          <button
            type="submit"
            className="crm-btn crm-btn-primary"
            disabled={busy}
          >
            {busy ? "Bezig…" : "Bod plaatsen"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function MarketplaceListingCard({
  listing,
}: {
  listing: MarketplaceListing;
}) {
  const photo = listing.photos?.[0]?.url;
  return (
    <Link href={`/marketplace/${listing.slug}`} className="mp-card">
      <div className="mp-card-thumb">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <div className="mp-card-placeholder">Geen foto</div>
        )}
      </div>
      <div className="mp-card-body">
        <h3>{listingTitle(listing)}</h3>
        <p>{listing.woonplaats}</p>
        <div className="mp-card-meta">
          <span>
            {listing.bidCount ?? 0} bod
            {(listing.bidCount ?? 0) === 1 ? "" : "en"}
          </span>
          <AuctionTimer endsAt={listing.endsAt} />
        </div>
        {listing.highestBid != null && (
          <strong>{formatEuro(listing.highestBid)}</strong>
        )}
      </div>
    </Link>
  );
}
