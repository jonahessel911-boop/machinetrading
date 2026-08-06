/** Client-side image compressie vóór upload (Vercel body-limiet ~4.5MB). */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.78;
const TARGET_MAX_BYTES = 1.4 * 1024 * 1024;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Foto kon niet worden gelezen"));
    };
    img.src = url;
  });
}

async function canvasToJpegBlob(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Compressie mislukt");
  return blob;
}

/**
 * Verklein/comprimeer een foto voor upload.
 * HEIC e.d. die de browser niet kan decoderen: origineel terug als die klein genoeg is.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && file.type !== "" && file.type !== "application/octet-stream") {
    return file;
  }

  // Al klein genoeg → geen extra werk
  if (file.size <= TARGET_MAX_BYTES && file.type === "image/jpeg") {
    return file;
  }

  try {
    const img = await loadImage(file);
    let quality = JPEG_QUALITY;
    let maxEdge = MAX_EDGE;
    let blob = await canvasToJpegBlob(img, maxEdge, quality);

    // Nog te groot → agressiever
    if (blob.size > TARGET_MAX_BYTES) {
      quality = 0.68;
      maxEdge = 1280;
      blob = await canvasToJpegBlob(img, maxEdge, quality);
    }
    if (blob.size > TARGET_MAX_BYTES) {
      quality = 0.58;
      maxEdge = 1024;
      blob = await canvasToJpegBlob(img, maxEdge, quality);
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    if (file.size <= 3.5 * 1024 * 1024) return file;
    throw new Error(
      `"${file.name}" is te groot of kan niet worden gecomprimeerd. Kies een kleinere foto.`,
    );
  }
}

export async function compressImagesForUpload(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    out.push(await compressImageForUpload(f));
  }
  return out;
}
