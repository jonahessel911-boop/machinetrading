import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceDetailClient } from "@/components/marketplace/MarketplaceDetailClient";
import { MarketplaceChrome } from "@/components/marketplace/MarketplaceChrome";
import { AuctionTimer } from "@/components/marketplace/AuctionTimer";
import { LoginToView } from "@/components/marketplace/LoginToView";
import { isDemoMode } from "@/lib/crm";
import { getDealerSession } from "@/lib/dealer-auth";
import { listingTitle, sanitizeListingForGuest } from "@/lib/marketplace";
import { mpGetBySlug } from "@/lib/marketplace-data";
import { formatEuro } from "@/lib/status";

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const dealer = await getDealerSession();
  const { slug } = await params;
  const raw = await mpGetBySlug(slug, { includeExpired: true });
  if (!raw) notFound();

  const isGuest = !dealer;
  const listing = isGuest ? sanitizeListingForGuest(raw) : raw;
  const loginHref = `/dealer/login?next=${encodeURIComponent(`/marketplace/${slug}`)}`;

  return (
    <MarketplaceChrome dealer={dealer} demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
          <p className="crm-subtitle" style={{ marginBottom: "0.55rem" }}>
            <Link href="/marketplace" className="crm-btn">
              ← Terug naar overzicht
            </Link>
          </p>
          <p className="crm-subtitle">
            {listing.woonplaats}
            {listing.isLive ? (
              <>
                {" · "}
                <AuctionTimer endsAt={listing.endsAt} precise />
              </>
            ) : (
              " · Veiling gesloten"
            )}
          </p>
          <h1 className="crm-title">{listingTitle(listing)}</h1>
        </div>
        <div>
          {isGuest ? (
            <LoginToView href={loginHref} compact className="mp-header-gated">
              <div className="crm-stat" style={{ minWidth: 160 }}>
                <span>Hoogste bod</span>
                <strong>€ 12.500</strong>
              </div>
            </LoginToView>
          ) : listing.highestBid != null ? (
            <div className="crm-stat" style={{ minWidth: 160 }}>
              <span>Hoogste bod</span>
              <strong>{formatEuro(listing.highestBid)}</strong>
            </div>
          ) : (
            <div className="crm-stat" style={{ minWidth: 160 }}>
              <span>Biedingen</span>
              <strong>Nog geen</strong>
            </div>
          )}
        </div>
      </div>

      <MarketplaceDetailClient
        initialListing={listing}
        isGuest={isGuest}
      />
    </MarketplaceChrome>
  );
}
