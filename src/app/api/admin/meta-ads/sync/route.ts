import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { hasMetaAccessToken, listMetaAdAccounts } from "@/lib/meta-ads";
import { crmSyncMetaAdSpend } from "@/lib/period-data";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!hasMetaAccessToken()) {
      return NextResponse.json({
        configured: false,
        accounts: [],
        error:
          "Geen META_ACCESS_TOKEN gezet. Voeg een Meta token toe met ads_read rechten.",
      });
    }
    const accounts = await listMetaAdAccounts();
    return NextResponse.json({
      configured: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        configured: hasMetaAccessToken(),
        accounts: [],
        error: err instanceof Error ? err.message : "Fout",
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const daysBack = Math.min(
      90,
      Math.max(1, Number(body.daysBack) || 30),
    );
    const result = await crmSyncMetaAdSpend({ daysBack });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync mislukt" },
      { status: 502 },
    );
  }
}
