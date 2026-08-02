import { NextResponse } from "next/server";
import { trackFunnelStep } from "@/lib/funnel-data";
import { FUNNEL_SITE_DEFAULT, isFunnelStep } from "@/lib/funnel";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const step = typeof body.step === "string" ? body.step.trim() : "";
    const site =
      typeof body.site === "string" && body.site.trim()
        ? body.site.trim()
        : FUNNEL_SITE_DEFAULT;

    if (!sessionId || !isFunnelStep(step)) {
      return NextResponse.json({ error: "Ongeldig" }, { status: 400 });
    }

    const result = await trackFunnelStep({ site, sessionId, step });
    return NextResponse.json(result);
  } catch (err) {
    console.warn("[api/funnel]", err);
    // Never break the form UX
    return NextResponse.json({ ok: false });
  }
}
