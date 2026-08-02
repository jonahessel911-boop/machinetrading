import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isAuthenticated } from "@/lib/auth";
import { getDemoStore, isDemoMode } from "@/lib/demo-store";
import { mapPhoto, type LeadPhotoRow } from "@/lib/mappers";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string; photoId: string }> };

const MAX_BYTES = 8 * 1024 * 1024;

/** Same-origin image bytes for canvas editing (avoids CORS taint). */
export async function GET(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leadId, photoId } = await params;

  try {
    if (isDemoMode()) {
      const row = getDemoStore().photos.find(
        (p) => p.id === photoId && p.lead_id === leadId,
      );
      if (!row) {
        return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
      }
      if (row.url.startsWith("data:")) {
        const base64 = row.url.split(",")[1] ?? "";
        const buf = Buffer.from(base64, "base64");
        return new NextResponse(buf, {
          headers: {
            "Content-Type": row.mime_type || "image/jpeg",
            "Cache-Control": "no-store",
          },
        });
      }
      const res = await fetch(row.url);
      const buf = Buffer.from(await res.arrayBuffer());
      return new NextResponse(buf, {
        headers: {
          "Content-Type": row.mime_type || "image/jpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error } = await supabase
      .from("lead_photos")
      .select("*")
      .eq("id", photoId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error || !existing) {
      return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
    }

    if (existing.storage_path) {
      const { data, error: dlError } = await supabase.storage
        .from("lead-photos")
        .download(existing.storage_path);
      if (dlError || !data) {
        return NextResponse.json(
          { error: dlError?.message || "Download mislukt" },
          { status: 500 },
        );
      }
      const buf = Buffer.from(await data.arrayBuffer());
      return new NextResponse(buf, {
        headers: {
          "Content-Type": existing.mime_type || "image/jpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    const res = await fetch(existing.url);
    if (!res.ok) {
      return NextResponse.json({ error: "Foto laden mislukt" }, { status: 502 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        "Content-Type": existing.mime_type || "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leadId, photoId } = await params;

  try {
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Geen foto ontvangen" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Bestand groter dan 8MB" }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    let out: Buffer;
    try {
      out = await sharp(raw, { failOn: "none" })
        .rotate()
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } catch {
      out = raw;
    }

    if (isDemoMode()) {
      const store = getDemoStore();
      const row = store.photos.find(
        (p) => p.id === photoId && p.lead_id === leadId,
      );
      if (!row) {
        return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
      }
      row.url = `data:image/jpeg;base64,${out.toString("base64")}`;
      row.mime_type = "image/jpeg";
      row.size = out.length;
      row.original_name = file.name || row.original_name;
      return NextResponse.json({ ok: true, photo: mapPhoto(row) });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("lead_photos")
      .select("*")
      .eq("id", photoId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
    }

    const filename = `${randomUUID()}.jpg`;
    const storagePath = `leads/${leadId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("lead-photos")
      .upload(storagePath, new Uint8Array(out), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload mislukt: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("lead-photos")
      .getPublicUrl(storagePath);

    const url = `${publicUrl.publicUrl}?v=${Date.now()}`;

    const { data: updated, error: updateError } = await supabase
      .from("lead_photos")
      .update({
        filename,
        original_name: file.name || existing.original_name,
        mime_type: "image/jpeg",
        size: out.length,
        url,
        storage_path: storagePath,
      })
      .eq("id", photoId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Foto-metadata bijwerken mislukt" },
        { status: 500 },
      );
    }

    if (existing.storage_path && existing.storage_path !== storagePath) {
      void supabase.storage.from("lead-photos").remove([existing.storage_path]);
    }

    return NextResponse.json({
      ok: true,
      photo: mapPhoto(updated as LeadPhotoRow),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Opslaan mislukt",
      },
      { status: 500 },
    );
  }
}
