import { getDemoStore, isDemoMode, newId } from "./demo-store";
import { getSupabaseAdmin } from "./supabase";

export type LeadMessageRow = {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  to_email: string;
  sent_at: string;
  created_at: string;
};

export type LeadMessage = {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  toEmail: string;
  sentAt: string;
  createdAt: string;
};

function mapMessage(row: LeadMessageRow): LeadMessage {
  return {
    id: row.id,
    leadId: row.lead_id,
    subject: row.subject,
    body: row.body,
    toEmail: row.to_email,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

export async function crmListLeadMessages(
  leadId: string,
): Promise<LeadMessage[]> {
  if (isDemoMode()) {
    return getDemoStore()
      .messages.filter((m) => m.lead_id === leadId)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
      )
      .map(mapMessage);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("sent_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapMessage(row as LeadMessageRow));
}

export async function crmInsertLeadMessage(input: {
  leadId: string;
  subject: string;
  body: string;
  toEmail: string;
}): Promise<LeadMessage> {
  const now = new Date().toISOString();
  const row: LeadMessageRow = {
    id: newId("msg"),
    lead_id: input.leadId,
    subject: input.subject.trim(),
    body: input.body.trim(),
    to_email: input.toEmail.trim().toLowerCase(),
    sent_at: now,
    created_at: now,
  };

  if (isDemoMode()) {
    getDemoStore().messages.unshift(row);
    return mapMessage(row);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      id: row.id,
      lead_id: row.lead_id,
      subject: row.subject,
      body: row.body,
      to_email: row.to_email,
      sent_at: row.sent_at,
      created_at: row.created_at,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Bericht opslaan mislukt");
  return mapMessage(data as LeadMessageRow);
}
