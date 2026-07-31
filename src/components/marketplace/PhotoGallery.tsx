"use client";

import Image from "next/image";
import { useEffect, useCallback, useState, useMemo } from "react";

type Photo = {
  id: string;
  url: string;
  originalName?: string;
};

/** Breedtes die Next image optimizer toestaat (deviceSizes) */
const LIGHTBOX_W = 1080;
const LIGHTBOX_Q = 72;
const THUMB_W = 256;
const THUMB_Q = 60;

function isRemoteHttp(url: string) {
  return /^https?:\/\//i.test(url);
}

/** Directe Next.js image-optimizer URL — zelfde URL = browser-cache hit */
function nextOptimizedUrl(src: string, width: number, quality: number) {
  if (!isRemoteHttp(src)) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
  });
  return `/_next/image?${params}`;
}

function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
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
  /** Welke lightbox-URL's al in cache zitten */
  const [readyIds, setReadyIds] = useState<Record<string, true>>({});

  const lightboxSrc = useCallback((url: string) => {
    return nextOptimizedUrl(url, LIGHTBOX_W, LIGHTBOX_Q);
  }, []);

  const thumbSrc = useCallback((url: string) => {
    return nextOptimizedUrl(url, THUMB_W, THUMB_Q);
  }, []);

  const photoIds = useMemo(() => photos.map((p) => p.id).join(","), [photos]);

  // Prefetch alle lightbox-formaten zodra de grid zichtbaar is
  useEffect(() => {
    if (photos.length === 0) return;
    let cancelled = false;

    const run = async () => {
      // Eerst eerste 4 (meest waarschijnlijk geklikt), daarna rest
      const ordered = [
        ...photos.slice(0, 4),
        ...photos.slice(4),
      ];
      for (const p of ordered) {
        if (cancelled) return;
        const src = lightboxSrc(p.url);
        await preload(src);
        if (cancelled) return;
        setReadyIds((prev) =>
          prev[p.id] ? prev : { ...prev, [p.id]: true },
        );
      }
    };

    const ric = window.requestIdleCallback?.bind(window);
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (ric) {
      idleId = ric(() => {
        void run();
      }, { timeout: 800 });
    } else {
      timeoutId = setTimeout(() => {
        void run();
      }, 150);
    }

    return () => {
      cancelled = true;
      if (idleId != null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIds, lightboxSrc]);

  const openAt = useCallback(
    (index: number) => {
      setOpenIndex(index);
      // Prioriteit: huidige + buren meteen laden
      const idxs = [
        index,
        (index + 1) % photos.length,
        (index - 1 + photos.length) % photos.length,
      ];
      for (const i of idxs) {
        const p = photos[i];
        if (!p) continue;
        void preload(lightboxSrc(p.url)).then(() => {
          setReadyIds((prev) =>
            prev[p.id] ? prev : { ...prev, [p.id]: true },
          );
        });
      }
    },
    [photos, lightboxSrc],
  );

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(() => {
    setOpenIndex((i) => {
      if (i == null) return i;
      const nextI = (i - 1 + photos.length) % photos.length;
      const p = photos[nextI];
      if (p) {
        void preload(lightboxSrc(p.url)).then(() => {
          setReadyIds((prevState) =>
            prevState[p.id] ? prevState : { ...prevState, [p.id]: true },
          );
        });
      }
      // Prefetch nieuwe buur
      const neighbor = photos[(nextI - 1 + photos.length) % photos.length];
      if (neighbor) void preload(lightboxSrc(neighbor.url));
      return nextI;
    });
  }, [photos, lightboxSrc]);
  const next = useCallback(() => {
    setOpenIndex((i) => {
      if (i == null) return i;
      const nextI = (i + 1) % photos.length;
      const p = photos[nextI];
      if (p) {
        void preload(lightboxSrc(p.url)).then(() => {
          setReadyIds((prevState) =>
            prevState[p.id] ? prevState : { ...prevState, [p.id]: true },
          );
        });
      }
      const neighbor = photos[(nextI + 1) % photos.length];
      if (neighbor) void preload(lightboxSrc(neighbor.url));
      return nextI;
    });
  }, [photos, lightboxSrc]);

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
              void preload(lightboxSrc(p.url)).then(() => {
                setReadyIds((prevState) =>
                  prevState[p.id]
                    ? prevState
                    : { ...prevState, [p.id]: true },
                );
              });
            }}
            onFocus={() => {
              void preload(lightboxSrc(p.url)).then(() => {
                setReadyIds((prevState) =>
                  prevState[p.id]
                    ? prevState
                    : { ...prevState, [p.id]: true },
                );
              });
            }}
            aria-label={`Foto ${index + 1} vergroten`}
          >
            {isRemoteHttp(p.url) ? (
              <Image
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                width={THUMB_W}
                height={THUMB_W}
                sizes="120px"
                quality={THUMB_Q}
                loading={index < 6 ? "eager" : "lazy"}
                className="photo-thumb-img"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                loading={index < 6 ? "eager" : "lazy"}
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
            {/* Thumbnail meteen zichtbaar (al in cache van het grid) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc(open.url)}
              alt=""
              aria-hidden
              className={`photo-lightbox-img photo-lightbox-placeholder${
                openReady ? " is-hidden" : ""
              }`}
            />
            {/* Scherpe versie — vaak al geprefetched */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={open.id}
              src={lightboxSrc(open.url)}
              alt={open.originalName ?? `Foto ${openIndex + 1}`}
              decoding="async"
              className={`photo-lightbox-img photo-lightbox-full${
                openReady ? " is-ready" : ""
              }`}
              onLoad={() => {
                setReadyIds((prevState) =>
                  prevState[open.id]
                    ? prevState
                    : { ...prevState, [open.id]: true },
                );
              }}
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
