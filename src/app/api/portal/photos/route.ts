import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getDemoStore, isDemoMode, newId } from "@/lib/demo-store";
import { nextPhotoSortOrder } from "@/lib/lead-photos";
import { mapPhoto, type LeadPhotoRow } from "@/lib/mappers";
import { getPortalSession } from "@/lib/portal-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

/** Vercel request body limiet ~4.5MB — houd marge */
const MAX_BYTES = 4 * 1024 * 1024;

function isImageUpload(file: Blob, name: string): boolean {
  const type = (file.type || "").toLowerCase();
  if (ALLOWED.has(type) || type.startsWith("image/")) return true;
  // iOS/Android sturen soms geen of generiek MIME-type
  if (!type || type === "application/octet-stream") {
    return /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(name);
  }
  return false;
}

function guessExt(file: Blob, name: string): string {
  const fromName = name.includes(".")
    ? `.${name.split(".").pop()!.toLowerCase()}`
    : "";
  if (fromName && fromName.length <= 5) return fromName;
  const type = (file.type || "").toLowerCase();
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("heic") || type.includes("heif")) return ".heic";
  return ".jpg";
}

async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  try {
    const pipeline = sharp(buffer, { failOn: "none" }).rotate();
    const meta = await pipeline.metadata();
    const width = meta.width ?? 0;
    const resized =
      width > 1920
        ? pipeline.resize(1920, 1920, {
            fit: "inside",
            withoutEnlargement: true,
          })
        : pipeline;

    if (mimeType.includes("webp")) {
      const out = await resized.webp({ quality: 78 }).toBuffer();
      return { buffer: out, contentType: "image/webp", ext: ".webp" };
    }

    const out = await resized.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    return { buffer: out, contentType: "image/jpeg", ext: ".jpg" };
  } catch (err) {
    console.warn("[portal:photos:optimize] fallback", err);
    const ext = mimeType.includes("png")
      ? ".png"
      : mimeType.includes("webp")
        ? ".webp"
        : ".jpg";
    return {
      buffer,
      contentType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
      ext,
    };
  }
}

function collectFiles(form: FormData): { blob: Blob; name: string }[] {
  const out: { blob: Blob; name: string }[] = [];
  for (const value of form.getAll("photos")) {
    if (typeof value === "string") continue;
    // File extends Blob; in sommige runtimes is het alleen Blob
    if (value instanceof Blob) {
      const name =
        "name" in value && typeof (value as File).name === "string"
          ? (value as File).name
          : "foto.jpg";
      out.push({ blob: value, name });
    }
  }
  return out;
}

/** Portaal: foto's uploaden voor de ingelogde lead. */
export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leadId = session.leadId;

  try {
    const form = await request.formData();
    const files = collectFiles(form);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Geen foto's ontvangen" },
        { status: 400 },
      );
    }
    if (files.length > 12) {
      return NextResponse.json(
        { error: "Maximaal 12 foto's per keer" },
        { status: 400 },
      );
    }

    if (isDemoMode()) {
      const store = getDemoStore();
      const lead = store.leads.find((l) => l.id === leadId);
      if (!lead) {
        return NextResponse.json(
          { error: "Lead niet gevonden" },
          { status: 404 },
        );
      }

      const saved = [];
      for (const { blob, name } of files) {
        if (!isImageUpload(blob, name)) {
          return NextResponse.json(
            { error: `Bestandstype niet toegestaan: ${name}` },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(await blob.arrayBuffer());
        const dataUrl = `data:${blob.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
        const sortOrder = await nextPhotoSortOrder(leadId);
        const row: LeadPhotoRow = {
          id: newId("photo"),
          lead_id: leadId,
          filename: name,
          original_name: name,
          mime_type: blob.type || "image/jpeg",
          size: blob.size,
          url: dataUrl,
          storage_path: null,
          created_at: new Date().toISOString(),
          sort_order: sortOrder,
        };
        store.photos.push(row);
        saved.push(mapPhoto(row));
      }
      return NextResponse.json({ ok: true, photos: saved });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }
    if (
      String(lead.email || "")
        .trim()
        .toLowerCase() !== session.email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saved = [];

    for (const { blob, name } of files) {
      if (!isImageUpload(blob, name)) {
        return NextResponse.json(
          { error: `Bestandstype niet toegestaan: ${name}` },
          { status: 400 },
        );
      }
      if (blob.size > MAX_BYTES) {
        return NextResponse.json(
          {
            error: `${name} is te groot (max. 4MB). Maak de foto kleiner of kies een andere.`,
          },
          { status: 400 },
        );
      }

      const raw = Buffer.from(await blob.arrayBuffer());
      const optimized = await optimizeImage(
        raw,
        blob.type || "image/jpeg",
      );
      const filename = `${randomUUID()}${optimized.ext || guessExt(blob, name)}`;
      const storagePath = `leads/${leadId}/${filename}`;
      const bytes = new Uint8Array(optimized.buffer);

      const { error: uploadError } = await supabase.storage
        .from("lead-photos")
        .upload(storagePath, bytes, {
          contentType: optimized.contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[portal:photos:upload]", uploadError);
        return NextResponse.json(
          { error: `Upload mislukt: ${uploadError.message}` },
          { status: 500 },
        );
      }

      const { data: publicUrl } = supabase.storage
        .from("lead-photos")
        .getPublicUrl(storagePath);

      const { data: photo, error: photoError } = await supabase
        .from("lead_photos")
        .insert({
          lead_id: leadId,
          filename,
          original_name: name,
          mime_type: optimized.contentType,
          size: optimized.buffer.length,
          url: publicUrl.publicUrl,
          storage_path: storagePath,
          sort_order: await nextPhotoSortOrder(leadId),
        })
        .select("*")
        .single();

      if (photoError || !photo) {
        console.error("[portal:photos:insert]", photoError);
        return NextResponse.json(
          {
            error:
              photoError?.message ||
              "Foto-metadata opslaan mislukt",
          },
          { status: 500 },
        );
      }

      saved.push(mapPhoto(photo as LeadPhotoRow));
    }

    return NextResponse.json({ ok: true, photos: saved });
  } catch (error) {
    console.error("[portal:photos]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload mislukt",
      },
      { status: 500 },
    );
  }
}
