"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminMarketplaceActions({
  listingId,
  isLive,
}: {
  listingId: string;
  isLive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: "republish" | "unpublish") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, listingId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Mislukt");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-actions" style={{ margin: 0 }}>
      {!isLive && (
        <button
          type="button"
          className="crm-btn crm-btn-primary"
          disabled={busy}
          onClick={() => run("republish")}
        >
          +7 dagen
        </button>
      )}
      {isLive && (
        <button
          type="button"
          className="crm-btn"
          disabled={busy}
          onClick={() => run("unpublish")}
        >
          Intrekken
        </button>
      )}
    </div>
  );
}
