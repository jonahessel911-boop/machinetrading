import { getDemoStore, isDemoMode, newId } from "@/lib/demo-store";
import {
  buildSiteFunnelStats,
  FUNNEL_SITE_DEFAULT,
  FUNNEL_STEP_ORDER,
  isFunnelStep,
  type FunnelSiteStats,
  type FunnelStep,
} from "@/lib/funnel";
import { getSupabaseAdmin } from "@/lib/supabase";

export type FunnelEventRow = {
  id: string;
  site: string;
  session_id: string;
  step: string;
  created_at: string;
};

/** Record unique step reach for a session (idempotent). */
export async function trackFunnelStep(input: {
  site?: string;
  sessionId: string;
  step: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const site = (input.site || FUNNEL_SITE_DEFAULT).trim() || FUNNEL_SITE_DEFAULT;
  const sessionId = input.sessionId.trim();
  const step = input.step.trim();

  if (!sessionId || !isFunnelStep(step)) {
    return { ok: false };
  }

  if (isDemoMode()) {
    const store = getDemoStore();
    const exists = store.funnelEvents.some(
      (e) =>
        e.site === site && e.session_id === sessionId && e.step === step,
    );
    if (exists) return { ok: true, skipped: true };
    store.funnelEvents.push({
      id: newId("funnel"),
      site,
      session_id: sessionId,
      step,
      created_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("funnel_events").upsert(
    {
      site,
      session_id: sessionId,
      step,
    },
    { onConflict: "site,session_id,step", ignoreDuplicates: true },
  );

  if (error) {
    // Table may not exist yet — don't break the form
    console.warn("[funnel:track]", error.message);
    return { ok: false };
  }
  return { ok: true };
}

export async function crmFunnelLeadCr(): Promise<FunnelSiteStats[]> {
  const sites = new Set<string>([FUNNEL_SITE_DEFAULT]);
  const bySite = new Map<string, Partial<Record<FunnelStep, number>>>();

  function bump(site: string, step: string) {
    if (!isFunnelStep(step)) return;
    sites.add(site);
    const counts = bySite.get(site) ?? {};
    counts[step] = (counts[step] ?? 0) + 1;
    bySite.set(site, counts);
  }

  if (isDemoMode()) {
    for (const e of getDemoStore().funnelEvents) {
      bump(e.site || FUNNEL_SITE_DEFAULT, e.step);
    }
  } else {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("funnel_events")
      .select("site, step");

    if (error) {
      console.warn("[funnel:stats]", error.message);
    } else {
      for (const row of data ?? []) {
        bump(
          (row.site as string) || FUNNEL_SITE_DEFAULT,
          row.step as string,
        );
      }
    }
  }

  // Always show default site even with zero data
  if (!bySite.has(FUNNEL_SITE_DEFAULT)) {
    bySite.set(FUNNEL_SITE_DEFAULT, {});
  }

  const result: FunnelSiteStats[] = [];
  for (const site of [...sites].sort()) {
    result.push(buildSiteFunnelStats(site, bySite.get(site) ?? {}));
  }

  // Prefer known step order presence
  void FUNNEL_STEP_ORDER;
  return result;
}
