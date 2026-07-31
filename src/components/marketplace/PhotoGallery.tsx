"use client";

import Image from "next/image";
import { useEffect, useCallback, useState } from "react";

type Photo = {
  id: string;
  url: string;
  originalName?: string;
};

function isRemoteHttp(url: string) {
  return /^https?:\/\//i.test(url);
}

export function PhotoGallery({
  photos,
  gridClassName = "mp-photo-grid",
  thumbClassName = "mp-photo-thumb",
}: {
  photos: Photo[];
  gridClassName?: string;
  thumbClassName?: string;
}) {
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

  const open = openIndex != null ? photos[openIndex] : null;

  return (
    <>
      <div className={gridClassName}>
        {photos.map((p, index) => (
          <button
            key={p.id}
            type="button"
            className={thumbClassName}
            onClick={() => setOpenIndex(index)}
            aria-label={`Foto ${index + 1} vergroten`}
          >
            {isRemoteHttp(p.url) ? (
              <Image
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                width={280}
                height={280}
                sizes="(max-width: 700px) 33vw, 120px"
                quality={60}
                loading="lazy"
                className="photo-thumb-img"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="photo-thumb-img"
              />
            )}
          </button>
        ))}
      </div>

      {open && openIndex != null && (
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
            {isRemoteHttp(open.url) ? (
              <Image
                key={open.id}
                src={open.url}
                alt={open.originalName ?? `Foto ${openIndex + 1}`}
                width={1600}
                height={1200}
                sizes="92vw"
                quality={80}
                priority
                className="photo-lightbox-img"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={open.id}
                src={open.url}
                alt={open.originalName ?? `Foto ${openIndex + 1}`}
                decoding="async"
                className="photo-lightbox-img"
              />
            )}
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
