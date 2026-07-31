import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getDemoStore, isDemoMode, newId } from "@/lib/demo-store";
import { mapPhoto, type LeadPhotoRow } from "@/lib/mappers";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_BYTES = 8 * 1024 * 1024;

/** Verklein/compresseer voor snellere admin + marketplace loads */
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

    // HEIC/PNG → JPEG voor kleinere bestanden; webp behouden als incoming webp
    if (mimeType.includes("webp")) {
      const out = await resized.webp({ quality: 78 }).toBuffer();
      return { buffer: out, contentType: "image/webp", ext: ".webp" };
    }

    const out = await resized.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    return { buffer: out, contentType: "image/jpeg", ext: ".jpg" };
  } catch (err) {
    console.warn("[photos:optimize] fallback naar origineel", err);
    const ext = mimeType.includes("png")
      ? ".png"
      : mimeType.includes("webp")
        ? ".webp"
        : ".jpg";
    return {
      buffer,
      contentType: mimeType || "image/jpeg",
      ext,
    };
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    if (isDemoMode()) {
      const store = getDemoStore();
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) {
        return NextResponse.json(
          { error: "Lead niet gevonden" },
          { status: 404 },
        );
      }

      const form = await request.formData();
      const files = form
        .getAll("photos")
        .filter((f): f is File => f instanceof File);
      if (files.length === 0) {
        return NextResponse.json(
          { error: "Geen foto's ontvangen" },
          { status: 400 },
        );
      }

      const saved = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const dataUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
        const row: LeadPhotoRow = {
          id: newId("photo"),
          lead_id: id,
          filename: file.name,
          original_name: file.name,
          mime_type: file.type || "image/jpeg",
          size: file.size,
          url: dataUrl,
          storage_path: null,
          created_at: new Date().toISOString(),
        };
        store.photos.push(row);
        saved.push(mapPhoto(row));
      }
      return NextResponse.json({ ok: true, photos: saved });
    }

    const supabase = getSupabaseAdmin();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const form = await request.formData();
    const files = form
      .getAll("photos")
      .filter((f): f is File => f instanceof File);

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

    const saved = [];

    for (const file of files) {
      if (!ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `Bestandstype niet toegestaan: ${file.name}` },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `${file.name} is groter dan 8MB` },
          { status: 400 },
        );
      }

      const ext = file.name.includes(".")
        ? `.${file.name.split(".").pop()!.toLowerCase()}`
        : file.type.includes("png")
          ? ".png"
          : file.type.includes("webp")
            ? ".webp"
            : ".jpg";
      const raw = Buffer.from(await file.arrayBuffer());
      const optimized = await optimizeImage(raw, file.type || "image/jpeg");
      const filename = `${randomUUID()}${optimized.ext || ext}`;
      const storagePath = `leads/${id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("lead-photos")
        .upload(storagePath, optimized.buffer, {
          contentType: optimized.contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
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
          lead_id: id,
          filename,
          original_name: file.name,
          mime_type: optimized.contentType,
          size: optimized.buffer.length,
          url: publicUrl.publicUrl,
          storage_path: storagePath,
        })
        .select("*")
        .single();

      if (photoError || !photo) {
        console.error(photoError);
        return NextResponse.json(
          { error: "Foto-metadata opslaan mislukt" },
          { status: 500 },
        );
      }

      saved.push(mapPhoto(photo as LeadPhotoRow));
    }

    return NextResponse.json({ ok: true, photos: saved });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload mislukt",
      },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (isDemoMode()) {
    const photos = getDemoStore()
      .photos.filter((p) => p.lead_id === id)
      .map(mapPhoto);
    return NextResponse.json(photos);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_photos")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((row) => mapPhoto(row as LeadPhotoRow)),
  );
}
