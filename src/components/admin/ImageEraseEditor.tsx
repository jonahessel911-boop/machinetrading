"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  photoId: string;
  leadId: string;
  onClose: () => void;
  onSaved: (photo: { id: string; url: string }) => void;
};

type Point = { x: number; y: number };

export function ImageEraseEditor({
  photoId,
  leadId,
  onClose,
  onSaved,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<Point | null>(null);
  const undoStack = useRef<ImageData[]>([]);

  const [brush, setBrush] = useState(28);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [canUndo, setCanUndo] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d", { willReadFrequently: true });
  }, []);

  const canvasPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const stamp = useCallback(
    (from: Point | null, to: Point) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = brush;

      if (!from) {
        ctx.beginPath();
        ctx.arc(to.x, to.y, brush / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.restore();
    },
    [brush, getCtx],
  );

  const pushUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.current.push(snap);
      if (undoStack.current.length > 25) undoStack.current.shift();
      setCanUndo(true);
    } catch {
      /* ignore */
    }
  }, [getCtx]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setReady(false);
      undoStack.current = [];
      setCanUndo(false);

      try {
        const res = await fetch(
          `/api/admin/leads/${leadId}/photos/${photoId}`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Foto laden mislukt",
          );
        }
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => {
            if (cancelled) {
              URL.revokeObjectURL(objUrl);
              resolve();
              return;
            }
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) {
              URL.revokeObjectURL(objUrl);
              reject(new Error("Canvas niet beschikbaar"));
              return;
            }

            const maxW = Math.min(1400, img.naturalWidth || img.width);
            const scale = maxW / (img.naturalWidth || img.width);
            const w = Math.round((img.naturalWidth || img.width) * scale);
            const h = Math.round((img.naturalHeight || img.height) * scale);
            canvas.width = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(objUrl);
            setReady(true);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            reject(new Error("Foto kon niet worden geladen"));
          };
          img.src = objUrl;
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Laden mislukt");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId, photoId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = getCtx();
        const snap = undoStack.current.pop();
        if (!canvas || !ctx || !snap) return;
        ctx.putImageData(snap, 0, 0);
        setCanUndo(undoStack.current.length > 0);
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [getCtx, onClose]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready || saving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    pushUndo();
    const p = canvasPoint(e);
    if (!p) return;
    stamp(null, p);
    last.current = p;
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = canvasPoint(e);
    if (!p) return;
    stamp(last.current, p);
    last.current = p;
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    last.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function undo() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    const snap = undoStack.current.pop();
    if (!canvas || !ctx || !snap) return;
    ctx.putImageData(snap, 0, 0);
    setCanUndo(undoStack.current.length > 0);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    setSaving(true);
    setError("");
    try {
      // Preview only — nog niet live naar de server
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ex = exportCanvas.getContext("2d");
      if (!ex) throw new Error("Preview mislukt");
      ex.fillStyle = "#ffffff";
      ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      ex.drawImage(canvas, 0, 0);

      await new Promise((r) => setTimeout(r, 300));
      onSaved({ id: photoId, url: exportCanvas.toDataURL("image/jpeg", 0.9) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="img-erase-backdrop" role="dialog" aria-modal="true">
      <div className="img-erase-panel">
        <div className="img-erase-head">
          <h2>Foto bewerken</h2>
          <p>Sleep om delen weg te gummen. Weggegumde stukken worden wit opgeslagen.</p>
        </div>

        <div className="img-erase-toolbar">
          <label className="img-erase-brush">
            Gum
            <input
              type="range"
              min={8}
              max={80}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
            />
            <span>{brush}px</span>
          </label>
          <button
            type="button"
            className="crm-btn"
            onClick={undo}
            disabled={!canUndo || saving}
          >
            Ongedaan
          </button>
          <div className="img-erase-spacer" />
          <button
            type="button"
            className="crm-btn"
            onClick={onClose}
            disabled={saving}
          >
            Annuleren
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            onClick={() => void save()}
            disabled={!ready || saving}
          >
            {saving ? "Bezig…" : "Opslaan (NIET LIVE)"}
          </button>
        </div>

        {error && <p className="img-erase-error">{error}</p>}

        <div className="img-erase-stage">
          <div className="img-erase-checker">
            <canvas
              ref={canvasRef}
              className="img-erase-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
          {!ready && !error && (
            <p className="img-erase-loading">Foto laden…</p>
          )}
        </div>
      </div>
    </div>
  );
}
