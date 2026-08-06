import { getDemoStore, isDemoMode } from "./demo-store";
import { mapPhoto, type LeadPhoto, type LeadPhotoRow } from "./mappers";
import { getSupabaseAdmin } from "./supabase";

function photoSortKey(p: LeadPhotoRow | LeadPhoto): [number, string] {
  if ("sortOrder" in p && typeof (p as LeadPhoto).sortOrder === "number") {
    const photo = p as LeadPhoto;
    return [photo.sortOrder, photo.createdAt];
  }
  const row = p as LeadPhotoRow;
  return [Number(row.sort_order ?? 0), row.created_at];
}

export function comparePhotoOrder(
  a: LeadPhotoRow | LeadPhoto,
  b: LeadPhotoRow | LeadPhoto,
) {
  const [as, ac] = photoSortKey(a);
  const [bs, bc] = photoSortKey(b);
  if (as !== bs) return as - bs;
  return ac.localeCompare(bc);
}

export function sortPhotoRows(rows: LeadPhotoRow[]): LeadPhotoRow[] {
  return [...rows].sort(comparePhotoOrder);
}

export function sortPhotos(photos: LeadPhoto[]): LeadPhoto[] {
  return [...photos].sort(comparePhotoOrder);
}

export async function nextPhotoSortOrder(leadId: string): Promise<number> {
  if (isDemoMode()) {
    const existing = getDemoStore().photos.filter((p) => p.lead_id === leadId);
    if (existing.length === 0) return 0;
    return Math.max(...existing.map((p) => Number(p.sort_order ?? 0))) + 1;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_photos")
    .select("sort_order")
    .eq("lead_id", leadId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Kolom nog niet gemigreerd → fallback
    if (/sort_order|schema cache|does not exist/i.test(error.message)) {
      return Date.now();
    }
    throw new Error(error.message);
  }
  return Number(data?.sort_order ?? -1) + 1;
}

export async function crmReorderLeadPhotos(
  leadId: string,
  photoIds: string[],
): Promise<LeadPhoto[]> {
  const ids = photoIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error("Geen foto's om te sorteren");

  if (isDemoMode()) {
    const store = getDemoStore();
    const leadPhotos = store.photos.filter((p) => p.lead_id === leadId);
    const idSet = new Set(leadPhotos.map((p) => p.id));
    if (ids.some((id) => !idSet.has(id)) || ids.length !== leadPhotos.length) {
      throw new Error("Ongeldige fotovolgorde");
    }
    for (let i = 0; i < ids.length; i++) {
      const row = store.photos.find((p) => p.id === ids[i]);
      if (row) row.sort_order = i;
    }
    return sortPhotoRows(store.photos.filter((p) => p.lead_id === leadId)).map(
      mapPhoto,
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("lead_photos")
    .select("id")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  const existingIds = new Set((existing ?? []).map((r) => r.id as string));
  if (
    ids.length !== existingIds.size ||
    ids.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Ongeldige fotovolgorde");
  }

  for (let i = 0; i < ids.length; i++) {
    const { error: upErr } = await supabase
      .from("lead_photos")
      .update({ sort_order: i })
      .eq("id", ids[i])
      .eq("lead_id", leadId);
    if (upErr) throw new Error(upErr.message);
  }

  const { data, error: listErr } = await supabase
    .from("lead_photos")
    .select("*")
    .eq("lead_id", leadId)
    .order("sort_order", { ascending: true });

  if (listErr) throw new Error(listErr.message);
  return sortPhotoRows((data ?? []) as LeadPhotoRow[]).map(mapPhoto);
}
