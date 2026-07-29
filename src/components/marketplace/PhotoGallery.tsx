"use client";

import { useEffect, useCallback, useState } from "react";

type Photo = {
  id: string;
  url: string;
  originalName?: string;
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(() => {
    setOpenIndex((i) =>
      i == null ? i : (i - 1 + photos.length) % photos.length,
    );
  }, [photos.length]);
  const next = useCallback(() => {
    setOpenIndex((i) => (i == null ? i : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (openIndex == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, close, prev, next]);

  if (photos.length === 0) {
    return <p className="crm-muted">Geen foto&apos;s beschikbaar.</p>;
  }

  return (
    <>
      <div className="mp-photo-grid">
        {photos.map((p, index) => (
          <button
            key={p.id}
            type="button"
            className="mp-photo-thumb"
            onClick={() => setOpenIndex(index)}
            aria-label={`Foto ${index + 1} vergroten`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.originalName ?? `Foto ${index + 1}`} />
          </button>
        ))}
      </div>

      {openIndex != null && (
        <div
          className="mp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto slideshow"
          onClick={close}
        >
          <button
            type="button"
            className="mp-lightbox-close"
            onClick={close}
            aria-label="Sluiten"
          >
            ×
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              className="mp-lightbox-nav mp-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Vorige foto"
            >
              ‹
            </button>
          )}

          <div
            className="mp-lightbox-stage"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[openIndex].url}
              alt={
                photos[openIndex].originalName ?? `Foto ${openIndex + 1}`
              }
            />
            <div className="mp-lightbox-counter">
              {openIndex + 1} / {photos.length}
            </div>
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              className="mp-lightbox-nav mp-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Volgende foto"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
