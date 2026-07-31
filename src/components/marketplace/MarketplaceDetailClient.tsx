"use client";

import { useState } from "react";
import type { MarketplaceListing } from "@/lib/marketplace";
import { formatEuro } from "@/lib/status";
import { AuctionTimer } from "./AuctionTimer";
import { BidForm } from "./MarketplaceParts";
import { LoginToBidCard, LoginToView } from "./LoginToView";
import { PhotoGallery } from "./PhotoGallery";

export function MarketplaceDetailClient({
  initialListing,
  isGuest = false,
}: {
  initialListing: MarketplaceListing;
  isGuest?: boolean;
}) {
  const [listing, setListing] = useState(initialListing);
  const photos = listing.photos ?? [];
  const loginHref = `/dealer/login?next=${encodeURIComponent(`/marketplace/${listing.slug}`)}`;

  return (
    <div className="crm-two">
      <div>
        <div className="crm-card">
          <div className="crm-card-head">Foto&apos;s</div>
          <div className="crm-card-body">
            <PhotoGallery photos={photos} />
          </div>
        </div>

        <div className="crm-card">
          <div className="crm-card-head">Details</div>
          <div className="crm-card-body">
            <div className="crm-fields">
              <div className="crm-field">
                <label>Merk</label>
                <div>{listing.merk}</div>
              </div>
              <div className="crm-field">
                <label>Model</label>
                <div>{listing.model ?? "—"}</div>
              </div>
              <div className="crm-field">
                <label>Woonplaats</label>
                <div>{listing.woonplaats}</div>
              </div>
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
                <label>Resterende tijd</label>
                <div>
                  {listing.isLive ? (
                    <AuctionTimer endsAt={listing.endsAt} precise />
                  ) : (
                    "Afgerond"
                  )}
                </div>
              </div>
            </div>

            {isGuest ? (
              <div style={{ marginTop: "1rem" }}>
                <label
                  className="crm-muted"
                  style={{
                    display: "block",
                    marginBottom: "0.4rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Beschrijving
                </label>
                <LoginToView href={loginHref}>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                    Goed onderhouden heftruck, recent gekeurd, direct
                    inzetbaar. Inclusief lader en documentatie. Bekijk alle
                    specifics na inloggen.
                  </p>
                </LoginToView>
              </div>
            ) : (
              listing.omschrijving && (
                <p style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
                  {listing.omschrijving}
                </p>
              )
            )}
          </div>
        </div>

        <div className="crm-card">
          <div className="crm-card-head">
            Biedingen
            {!isGuest && ` (${listing.bidCount ?? 0})`}
          </div>
          <div className="crm-card-body">
            {isGuest ? (
              <LoginToView href={loginHref}>
                <div className="crm-table-wrap" style={{ border: "none" }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Bedrijf / naam</th>
                        <th>Bod</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Handelaar BV</strong>
                          <div className="crm-muted">Jan Jansen</div>
                        </td>
                        <td>€ 12.500</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Lift Pro</strong>
                          <div className="crm-muted">Piet de Vries</div>
                        </td>
                        <td>€ 11.800</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Hef Service</strong>
                          <div className="crm-muted">Klaas Bakker</div>
                        </td>
                        <td>€ 10.900</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </LoginToView>
            ) : (listing.bids?.length ?? 0) > 0 ? (
              <div className="crm-table-wrap" style={{ border: "none" }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Bedrijf / naam</th>
                      <th>Bod</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listing.bids!.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.bidderBedrijf || b.bidderNaam}</strong>
                          <div className="crm-muted">{b.bidderNaam}</div>
                        </td>
                        <td>{formatEuro(b.bedrag)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="crm-muted">Nog geen biedingen.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        {isGuest ? (
          <LoginToBidCard
            nextPath={`/marketplace/${listing.slug}`}
            isLive={!!listing.isLive}
          />
        ) : (
          <BidForm
            slug={listing.slug}
            isLive={!!listing.isLive}
            highestBid={listing.highestBid}
            onBid={setListing}
          />
        )}
      </div>
    </div>
  );
}
