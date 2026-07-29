import { redirect, notFound } from "next/navigation";
import { MarketplaceDetailClient } from "@/components/marketplace/MarketplaceDetailClient";
import { MarketplaceChrome } from "@/components/marketplace/MarketplaceChrome";
import { isDemoMode } from "@/lib/crm";
import { getDealerSession } from "@/lib/dealer-auth";
import { listingTitle } from "@/lib/marketplace";
import { mpGetBySlug } from "@/lib/marketplace-data";
import { formatEuro } from "@/lib/status";
import { AuctionTimer } from "@/components/marketplace/AuctionTimer";

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const dealer = await getDealerSession();
  if (!dealer) redirect("/dealer/login");

  const { slug } = await params;
  const listing = await mpGetBySlug(slug, { includeExpired: true });
  if (!listing) notFound();

  return (
    <MarketplaceChrome dealer={dealer} demo={isDemoMode()}>
      <div className="crm-page-header">
        <div>
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
          {listing.highestBid != null ? (
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

      <MarketplaceDetailClient initialListing={listing} />
    </MarketplaceChrome>
  );
}
