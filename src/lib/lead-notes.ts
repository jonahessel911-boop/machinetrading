import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { getSupabaseAdmin } from "./supabase";

export type LeadNoteRow = {
  id: string;
  lead_id: string;
  body: string;
  author_naam: string;
  author_user_id: string | null;
  created_at: string;
};

export type LeadNote = {
  id: string;
  leadId: string;
  body: string;
  authorNaam: string;
  authorUserId: string | null;
  createdAt: string;
};

function mapNote(row: LeadNoteRow): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    body: row.body,
    authorNaam: row.author_naam,
    authorUserId: row.author_user_id,
    createdAt: row.created_at,
  };
}

export async function crmListLeadNotes(leadId: string): Promise<LeadNote[]> {
  if (isDemoMode()) {
    return getDemoStore()
      .notes.filter((n) => n.lead_id === leadId)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map(mapNote);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNote(row as LeadNoteRow));
}

export async function crmInsertLeadNote(input: {
  leadId: string;
  body: string;
  authorNaam: string;
  authorUserId?: string | null;
}): Promise<LeadNote> {
  const now = new Date().toISOString();
  const row: LeadNoteRow = {
    id: newId("note"),
    lead_id: input.leadId,
    body: input.body.trim(),
    author_naam: input.authorNaam.trim() || "Medewerker",
    author_user_id: input.authorUserId ?? null,
    created_at: now,
  };

  if (isDemoMode()) {
    getDemoStore().notes.unshift(row);
    return mapNote(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_notes")
    .insert({
      id: row.id,
      lead_id: row.lead_id,
      body: row.body,
      author_naam: row.author_naam,
      author_user_id: row.author_user_id,
      created_at: row.created_at,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Notitie opslaan mislukt");
  }
  return mapNote(data as LeadNoteRow);
}

export async function crmDeleteLeadNote(
  leadId: string,
  noteId: string,
): Promise<boolean> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const before = store.notes.length;
    store.notes = store.notes.filter(
      (n) => !(n.id === noteId && n.lead_id === leadId),
    );
    return store.notes.length < before;
  }

  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("lead_notes")
    .delete({ count: "exact" })
    .eq("id", noteId)
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
