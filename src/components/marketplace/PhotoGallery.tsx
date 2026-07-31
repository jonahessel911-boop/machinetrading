"use client";

import Image from "next/image";
import { useEffect, useCallback, useState, useMemo } from "react";

type Photo = {
  id: string;
  url: string;
  originalName?: string;
};

function isRemoteHttp(url: string) {
  return /^https?:\/\//i.test(url);
}

function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
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
  const [readyIds, setReadyIds] = useState<Record<string, true>>({});

  const photoIds = useMemo(() => photos.map((p) => p.id).join(","), [photos]);

  const markReady = useCallback((id: string) => {
    setReadyIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  // Prefetch originele foto's (direct Supabase — geen /_next/image bottleneck)
  useEffect(() => {
    if (photos.length === 0) return;
    let cancelled = false;

    const run = async () => {
      const ordered = [...photos.slice(0, 4), ...photos.slice(4)];
      for (const p of ordered) {
        if (cancelled) return;
        await preload(p.url);
        if (cancelled) return;
        markReady(p.id);
      }
    };

    const ric = window.requestIdleCallback?.bind(window);
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (ric) {
      idleId = ric(() => {
        void run();
      }, { timeout: 600 });
    } else {
      timeoutId = setTimeout(() => {
        void run();
      }, 100);
    }

    return () => {
      cancelled = true;
      if (idleId != null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [photoIds, photos, markReady]);

  const warm = useCallback(
    (index: number) => {
      const targets = [
        photos[index],
        photos[(index + 1) % photos.length],
        photos[(index - 1 + photos.length) % photos.length],
      ];
      for (const p of targets) {
        if (!p) continue;
        void preload(p.url).then(() => markReady(p.id));
      }
    },
    [photos, markReady],
  );

  const openAt = useCallback(
    (index: number) => {
      setOpenIndex(index);
      warm(index);
    },
    [warm],
  );

  const close = useCallback(() => setOpenIndex(null), []);

  const prev = useCallback(() => {
    setOpenIndex((i) => {
      if (i == null) return i;
      const nextI = (i - 1 + photos.length) % photos.length;
      warm(nextI);
      return nextI;
    });
  }, [photos.length, warm]);

  const next = useCallback(() => {
    setOpenIndex((i) => {
      if (i == null) return i;
      const nextI = (i + 1) % photos.length;
      warm(nextI);
      return nextI;
    });
  }, [photos.length, warm]);

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
  const openReady = open ? Boolean(readyIds[open.id]) : false;

  return (
    <>
      <div className={gridClassName}>
        {photos.map((p, index) => (
          <button
            key={p.id}
            type="button"
            className={thumbClassName}
            onClick={() => openAt(index)}
            onMouseEnter={() => {
              void preload(p.url).then(() => markReady(p.id));
            }}
            onFocus={() => {
              void preload(p.url).then(() => markReady(p.id));
            }}
            aria-label={`Foto ${index + 1} vergroten`}
          >
            {isRemoteHttp(p.url) ? (
              <Image
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                width={256}
                height={256}
                sizes="120px"
                quality={75}
                loading={index < 8 ? "eager" : "lazy"}
                className="photo-thumb-img"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                loading={index < 8 ? "eager" : "lazy"}
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
            {/* Directe Supabase-URL — geen /_next/image (die brak door quality-config) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={open.id}
              src={open.url}
              alt={open.originalName ?? `Foto ${openIndex + 1}`}
              decoding="async"
              className={`photo-lightbox-img photo-lightbox-full${
                openReady ? " is-ready" : ""
              }`}
              onLoad={() => markReady(open.id)}
            />
            {!openReady && (
              <div className="photo-lightbox-spinner" aria-hidden>
                <span />
              </div>
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
