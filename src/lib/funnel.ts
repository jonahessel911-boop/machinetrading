/** Form funnel steps tracked for Lead CR */

export const FUNNEL_SITE_DEFAULT = "heftruckverkocht.nl";

export const FUNNEL_STEP_ORDER = [
  "brand",
  "model",
  "timing",
  "price",
  "name",
  "loading",
  "contact",
  "done",
] as const;

export type FunnelStep = (typeof FUNNEL_STEP_ORDER)[number];

/** Steps shown in Lead CR (loading is auto — hide for cleaner CR) */
export const FUNNEL_CR_STEPS = [
  "brand",
  "model",
  "timing",
  "price",
  "name",
  "contact",
  "done",
] as const satisfies readonly FunnelStep[];

export const FUNNEL_STEP_LABELS: Record<FunnelStep, string> = {
  brand: "1. Merk",
  model: "2. Model",
  timing: "3. Timing",
  price: "4. Richtprijs",
  name: "5. Naam",
  loading: "6. Laden",
  contact: "7. Contact",
  done: "8. Aanmelding",
};

export type FunnelStepStats = {
  step: FunnelStep;
  label: string;
  sessions: number;
  /** % van vorige zichtbare stap (null voor eerste) */
  crPct: number | null;
};

export type FunnelSiteStats = {
  site: string;
  key: string;
  totalStarts: number;
  totalDone: number;
  overallCrPct: number;
  steps: FunnelStepStats[];
};

export function isFunnelStep(value: string): value is FunnelStep {
  return (FUNNEL_STEP_ORDER as readonly string[]).includes(value);
}

export function buildSiteFunnelStats(
  site: string,
  counts: Partial<Record<FunnelStep, number>>,
): FunnelSiteStats {
  const steps: FunnelStepStats[] = [];

  for (let i = 0; i < FUNNEL_CR_STEPS.length; i++) {
    const step = FUNNEL_CR_STEPS[i];
    const sessions = counts[step] ?? 0;
    const nextStep = FUNNEL_CR_STEPS[i + 1];
    let crPct: number | null = null;
    if (nextStep) {
      const nextSessions = counts[nextStep] ?? 0;
      crPct = sessions > 0 ? (nextSessions / sessions) * 100 : 0;
    }
    steps.push({
      step,
      label: FUNNEL_STEP_LABELS[step],
      sessions,
      crPct,
    });
  }

  const totalStarts = counts.brand ?? 0;
  const totalDone = counts.done ?? 0;
  const overallCrPct =
    totalStarts > 0 ? (totalDone / totalStarts) * 100 : 0;

  return {
    site,
    key: `site:${site}`,
    totalStarts,
    totalDone,
    overallCrPct,
    steps,
  };
}
