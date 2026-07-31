"use client";

import Link from "next/link";
import { useState } from "react";
import type { MarketplaceListing } from "@/lib/marketplace";
import { listingTitle } from "@/lib/marketplace";
import { formatEuro } from "@/lib/status";
import { AuctionTimer } from "./AuctionTimer";
import { LoginToView } from "./LoginToView";

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
  isGuest = false,
}: {
  listing: MarketplaceListing;
  isGuest?: boolean;
}) {
  const photo = listing.photos?.[0]?.url;
  const loginHref = `/dealer/login?next=${encodeURIComponent(`/marketplace/${listing.slug}`)}`;

  return (
    <Link href={`/marketplace/${listing.slug}`} className="mp-card">
      <div className="mp-card-thumb">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <div className="mp-card-placeholder">Geen foto</div>
        )}
        {isGuest && (
          <span className="mp-card-login-badge">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Login om te bieden
          </span>
        )}
      </div>
      <div className="mp-card-body">
        <h3>{listingTitle(listing)}</h3>
        <p>{listing.woonplaats}</p>
        <div className="mp-card-meta">
          {isGuest ? (
            <span className="mp-muted-gate">Biedingen verborgen</span>
          ) : (
            <span>
              {listing.bidCount ?? 0} bod
              {(listing.bidCount ?? 0) === 1 ? "" : "en"}
            </span>
          )}
          <AuctionTimer endsAt={listing.endsAt} />
        </div>
        {isGuest ? (
          <LoginToView
            href={loginHref}
            compact
            inert
            label="Login om te bekijken"
          >
            <strong>€ 12.500</strong>
          </LoginToView>
        ) : (
          listing.highestBid != null && (
            <strong>{formatEuro(listing.highestBid)}</strong>
          )
        )}
      </div>
    </Link>
  );
}
