"use client";

import { useEffect, useRef, useState } from "react";
import type { KvkCompanyProfile, KvkSearchHit } from "@/lib/kvk";

export function KvkCompanySearch({
  onSelect,
  placeholder = "Zoek op bedrijfsnaam…",
}: {
  onSelect: (profile: KvkCompanyProfile) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<KvkSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busySelect, setBusySelect] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/kvk/zoeken?q=${encodeURIComponent(q.trim())}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Zoeken mislukt");
        if (!cancelled) {
          setHits(Array.isArray(data) ? data : []);
          setOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          setHits([]);
          setError(err instanceof Error ? err.message : "Fout");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  async function pick(hit: KvkSearchHit) {
    setBusySelect(true);
    setError("");
    try {
      const res = await fetch(
        `/api/kvk/profiel?kvkNummer=${encodeURIComponent(hit.kvkNummer)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profiel ophalen mislukt");
      onSelect(data as KvkCompanyProfile);
      setQ(data.naam || hit.naam);
      setOpen(false);
      setHits([]);
    } catch (err) {
      // Fallback: use search hit data if basisprofiel fails
      onSelect({
        kvkNummer: hit.kvkNummer,
        naam: hit.naam,
        straat: hit.straatnaam,
        huisnummer: hit.huisnummer,
        postcode: hit.postcode,
        woonplaats: hit.plaats,
        land: "Nederland",
        vestigingsnummer: hit.vestigingsnummer,
      });
      setQ(hit.naam);
      setOpen(false);
      setError(
        err instanceof Error
          ? `${err.message} — basisgegevens uit zoekresultaat gebruikt.`
          : "Basisgegevens uit zoekresultaat gebruikt.",
      );
    } finally {
      setBusySelect(false);
    }
  }

  return (
    <div className="kvk-search" ref={wrapRef}>
      <label>
        Zoek bedrijf (KvK)
        <input
          className="crm-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={busySelect}
        />
      </label>
      {loading && <div className="crm-muted kvk-search-meta">Zoeken…</div>}
      {error && <div className="crm-form-error">{error}</div>}
      {open && hits.length > 0 && (
        <ul className="kvk-search-list" role="listbox">
          {hits.map((h) => (
            <li key={`${h.kvkNummer}-${h.vestigingsnummer || "x"}`}>
              <button
                type="button"
                className="kvk-search-item"
                onClick={() => pick(h)}
                disabled={busySelect}
              >
                <strong>{h.naam}</strong>
                <span className="crm-muted">
                  {[h.plaats, h.straatnaam, `KvK ${h.kvkNummer}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
