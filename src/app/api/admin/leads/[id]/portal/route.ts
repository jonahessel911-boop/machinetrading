import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmGetLead } from "@/lib/crm";
import { createPortalToken } from "@/lib/portal-auth";

type Params = { params: Promise<{ id: string }> };

/** Admin: open klantportaal voor deze lead (nieuwe magic link). */
export async function GET(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const token = await createPortalToken(lead.id, lead.email);
    // Zelfde origin als admin (lokaal → lokaal, prod → prod)
    const url = new URL(`/mijn/${encodeURIComponent(token)}`, request.url);

    const wantsJson =
      request.headers.get("accept")?.includes("application/json") ||
      new URL(request.url).searchParams.get("format") === "json";

    if (wantsJson) {
      return NextResponse.json({ url: url.toString() });
    }

    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
