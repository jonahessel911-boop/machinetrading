"use client";

import { useMemo, useState } from "react";
import type { MarketplaceListing } from "@/lib/marketplace";
import { MarketplaceListingCard } from "./MarketplaceParts";

type SortKey =
  | "time_desc"
  | "time_asc"
  | "price_desc"
  | "price_asc";

const SORTS: { key: SortKey; label: string; guestHidden?: boolean }[] = [
  { key: "time_desc", label: "Tijd aflopend" },
  { key: "time_asc", label: "Tijd oplopend" },
  { key: "price_desc", label: "Prijs aflopend", guestHidden: true },
  { key: "price_asc", label: "Prijs oplopend", guestHidden: true },
];

function sortListings(
  listings: MarketplaceListing[],
  sort: SortKey,
): MarketplaceListing[] {
  const rows = [...listings];
  rows.sort((a, b) => {
    if (sort === "time_desc") {
      return new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime();
    }
    if (sort === "time_asc") {
      return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
    }
    const pa = a.highestBid ?? -1;
    const pb = b.highestBid ?? -1;
    if (sort === "price_desc") return pb - pa;
    return pa - pb;
  });
  return rows;
}

export function MarketplaceBrowse({
  listings,
  isGuest = false,
}: {
  listings: MarketplaceListing[];
  isGuest?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("time_asc");
  const visibleSorts = SORTS.filter((s) => !isGuest || !s.guestHidden);
  const effectiveSort =
    isGuest && (sort === "price_desc" || sort === "price_asc")
      ? "time_asc"
      : sort;
  const sorted = useMemo(
    () => sortListings(listings, effectiveSort),
    [listings, effectiveSort],
  );

  if (listings.length === 0) {
    return (
      <div className="crm-card">
        <div className="crm-card-body">
          <p className="crm-muted">Momenteel geen actieve veilingen.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="crm-filter-bar mp-sort-bar">
        {visibleSorts.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`crm-btn${effectiveSort === s.key ? " crm-btn-primary" : ""}`}
            onClick={() => setSort(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mp-grid">
        {sorted.map((l) => (
          <MarketplaceListingCard
            key={l.id}
            listing={l}
            isGuest={isGuest}
          />
        ))}
      </div>
    </>
  );
}
