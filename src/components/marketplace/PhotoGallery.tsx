"use client";

import { useEffect, useCallback, useState, useMemo, useRef } from "react";

type Photo = {
  id: string;
  url: string;
  originalName?: string;
};

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
  editable = false,
  sortable = false,
  onEditPhoto,
  onDeletePhoto,
  onReorder,
}: {
  photos: Photo[];
  gridClassName?: string;
  thumbClassName?: string;
  editable?: boolean;
  /** Sleep om volgorde te wijzigen (admin) */
  sortable?: boolean;
  onEditPhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void | Promise<void>;
  onReorder?: (orderedIds: string[]) => void | Promise<void>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [readyIds, setReadyIds] = useState<Record<string, true>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragMoved = useRef(false);

  const photoIds = useMemo(() => photos.map((p) => p.id).join(","), [photos]);

  const markReady = useCallback((id: string) => {
    setReadyIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  // Prefetch originele foto's (direct Supabase — geen /_next/image)
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

  async function handleDelete(photo: Photo, e?: React.MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    if (!onDeletePhoto || deletingId) return;
    if (!window.confirm("Deze foto definitief verwijderen?")) return;
    setDeletingId(photo.id);
    try {
      await onDeletePhoto(photo);
      setOpenIndex((i) => {
        if (i == null) return i;
        const remaining = photos.filter((p) => p.id !== photo.id);
        if (remaining.length === 0) return null;
        return Math.min(i, remaining.length - 1);
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Verwijderen mislukt");
    } finally {
      setDeletingId(null);
    }
  }

  async function applyReorder(fromId: string, toId: string) {
    if (!onReorder || fromId === toId || savingOrder) return;
    const ids = photos.map((p) => p.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSavingOrder(true);
    try {
      await onReorder(next);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Volgorde opslaan mislukt");
    } finally {
      setSavingOrder(false);
    }
  }

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
      <div className={`${gridClassName}${sortable ? " is-sortable" : ""}`}>
        {photos.map((p, index) => (
          <div
            key={p.id}
            className={`photo-thumb-wrap${dragId === p.id ? " is-dragging" : ""}${
              overId === p.id && dragId && dragId !== p.id ? " is-drop-target" : ""
            }`}
            draggable={sortable && !savingOrder}
            onDragStart={(e) => {
              if (!sortable) return;
              dragMoved.current = false;
              setDragId(p.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", p.id);
            }}
            onDragOver={(e) => {
              if (!sortable || !dragId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overId !== p.id) setOverId(p.id);
            }}
            onDragLeave={() => {
              if (overId === p.id) setOverId(null);
            }}
            onDrop={(e) => {
              if (!sortable) return;
              e.preventDefault();
              const fromId = e.dataTransfer.getData("text/plain") || dragId;
              setOverId(null);
              setDragId(null);
              if (fromId) void applyReorder(fromId, p.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          >
            {sortable ? (
              <span className="photo-thumb-grip" aria-hidden>
                ⋮⋮
              </span>
            ) : null}
            <button
              type="button"
              className={thumbClassName}
              onClick={() => {
                if (dragMoved.current) return;
                openAt(index);
              }}
              onMouseEnter={() => {
                void preload(p.url).then(() => markReady(p.id));
              }}
              onFocus={() => {
                void preload(p.url).then(() => markReady(p.id));
              }}
              onDrag={() => {
                dragMoved.current = true;
              }}
              aria-label={`Foto ${index + 1} vergroten`}
            >
              {/* Directe URL — next/image brak thumbs (zelfde issue als lightbox) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.originalName ?? `Foto ${index + 1}`}
                loading={index < 8 ? "eager" : "lazy"}
                decoding="async"
                className="photo-thumb-img"
                draggable={false}
              />
            </button>
            {onDeletePhoto ? (
              <button
                type="button"
                className="photo-thumb-delete"
                disabled={deletingId === p.id}
                onClick={(e) => void handleDelete(p, e)}
                aria-label={`Foto ${index + 1} verwijderen`}
                title="Verwijderen"
              >
                ×
              </button>
            ) : null}
            {sortable ? (
              <span className="photo-thumb-order">{index + 1}</span>
            ) : null}
          </div>
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
            {editable && onEditPhoto && (
              <button
                type="button"
                className="mp-lightbox-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPhoto(open);
                  close();
                }}
              >
                Bewerken / gummen
              </button>
            )}
            {onDeletePhoto ? (
              <button
                type="button"
                className="mp-lightbox-delete"
                disabled={deletingId === open.id}
                onClick={(e) => void handleDelete(open, e)}
              >
                {deletingId === open.id ? "Bezig…" : "Verwijderen"}
              </button>
            ) : null}
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
