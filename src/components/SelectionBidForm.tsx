"use client";

import { useEffect, useState } from "react";
import { formatEuro } from "@/lib/status";

const STORAGE_BEDRIJF = "hv_selection_bidder_bedrijf";

function bidStorageKey(slug: string, leadId: string) {
  return `hv_selection_bid:${slug}:${leadId}`;
}

function normalizeBedrijf(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type PublicBid = {
  leadId: string;
  bedrag: number;
  bedrijf: string;
  createdAt: string;
  mine?: boolean;
};

function readStoredBid(
  slug: string,
  leadId: string,
): { bedrag: number; bedrijf: string } | null {
  try {
    const raw = localStorage.getItem(bidStorageKey(slug, leadId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { bedrag?: number; bedrijf?: string };
    if (
      typeof parsed.bedrag === "number" &&
      Number.isFinite(parsed.bedrag) &&
      parsed.bedrag > 0
    ) {
      return {
        bedrag: parsed.bedrag,
        bedrijf: String(parsed.bedrijf ?? "").trim(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredBid(
  slug: string,
  leadId: string,
  bedrag: number,
  bedrijf: string,
) {
  try {
    localStorage.setItem(
      bidStorageKey(slug, leadId),
      JSON.stringify({ bedrag, bedrijf }),
    );
    localStorage.setItem(STORAGE_BEDRIJF, bedrijf);
  } catch {
    /* ignore */
  }
}

export function SelectionBidForm({
  slug,
  leadId,
  machineLabel,
  dealerPrefill,
}: {
  slug: string;
  leadId: string;
  machineLabel: string;
  dealerPrefill?: {
    naam: string;
    email: string | null;
    telefoon: string | null;
    bedrijf: string;
  } | null;
}) {
  const [bedrag, setBedrag] = useState("");
  const [bedrijf, setBedrijf] = useState(dealerPrefill?.bedrijf ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      let knownBedrijf = dealerPrefill?.bedrijf?.trim() || "";
      if (!knownBedrijf) {
        try {
          knownBedrijf = localStorage.getItem(STORAGE_BEDRIJF)?.trim() || "";
        } catch {
          /* ignore */
        }
      }
      if (!cancelled && knownBedrijf) setBedrijf(knownBedrijf);

      const stored = readStoredBid(slug, leadId);
      if (stored && !cancelled) {
        setDone(stored.bedrag);
        if (stored.bedrijf) setBedrijf(stored.bedrijf);
        knownBedrijf = stored.bedrijf || knownBedrijf;
      }

      try {
        const res = await fetch(
          `/api/selectie/${encodeURIComponent(slug)}/bids`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { bids?: PublicBid[] };
        const bids = (data.bids ?? []).filter((b) => b.leadId === leadId);
        if (bids.length === 0 || cancelled) return;

        const key = normalizeBedrijf(knownBedrijf);
        const mine =
          bids.find((b) => b.mine) ||
          (key
            ? bids.find((b) => normalizeBedrijf(b.bedrijf) === key)
            : undefined);

        if (mine && !cancelled) {
          setDone(mine.bedrag);
          if (mine.bedrijf) {
            setBedrijf(mine.bedrijf);
            writeStoredBid(slug, leadId, mine.bedrag, mine.bedrijf);
          }
        }
      } catch {
        /* offline / negeer */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [slug, leadId, dealerPrefill]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const bedrijfTrim = bedrijf.trim();
      if (!bedrijfTrim) throw new Error("Bedrijfsnaam is verplicht");
      const amount = Number(bedrag.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Vul een geldig bod in");
      }

      const res = await fetch(
        `/api/selectie/${encodeURIComponent(slug)}/bids`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            bedrag: amount,
            bedrijf: bedrijfTrim,
          }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        bedrag?: number;
        bedrijf?: string;
      };
      if (!res.ok) throw new Error(data.error || "Bod mislukt");
      const placed = data.bedrag ?? amount;
      writeStoredBid(slug, leadId, placed, bedrijfTrim);
      setDone(placed);
      setBedrag("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated && done == null) {
    return (
      <div className="share-bid share-bid-done">
        <p className="share-bid-success crm-muted">Bod laden…</p>
      </div>
    );
  }

  if (done != null) {
    return (
      <div className="share-bid share-bid-done">
        <p className="share-bid-success">
          Bod geplaatst: <strong>{formatEuro(done)}</strong> op {machineLabel}
          {bedrijf ? (
            <span className="share-bid-company-tag"> · {bedrijf}</span>
          ) : null}
        </p>
        <button
          type="button"
          className="share-bid-again"
          onClick={() => setDone(null)}
        >
          Nog een bod plaatsen
        </button>
      </div>
    );
  }

  return (
    <form className="share-bid" onSubmit={submit}>
      <div className="share-bid-row">
        <label className="share-bid-amount">
          Bod (€)
          <input
            type="number"
            min={1}
            step={1}
            required
            inputMode="numeric"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            placeholder="bijv. 12500"
          />
        </label>
        <label className="share-bid-company">
          Bedrijfsnaam
          <input
            required
            value={bedrijf}
            onChange={(e) => setBedrijf(e.target.value)}
            placeholder="Uw bedrijf"
          />
        </label>
        <button type="submit" className="share-bid-submit" disabled={busy}>
          {busy ? "Bezig…" : "Bod plaatsen"}
        </button>
      </div>
      {error ? <p className="share-bid-error">{error}</p> : null}
    </form>
  );
}
