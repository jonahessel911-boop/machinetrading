"use client";

import { FUNNEL_SITE_DEFAULT, type FunnelStep } from "@/lib/funnel";

const SID_KEY = "hv-funnel-sid";

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SID_KEY, id);
    return id;
  } catch {
    return `s-${Date.now().toString(36)}`;
  }
}

/** Fire-and-forget: unique step reach for this browser session. */
export function trackFormStep(step: FunnelStep | string) {
  if (typeof window === "undefined") return;
  try {
    const sessionId = getOrCreateSessionId();
    void fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        step,
        site: FUNNEL_SITE_DEFAULT,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
