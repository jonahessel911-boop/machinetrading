import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmPeriodReport, crmUpsertPeriodCost } from "@/lib/period-data";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await crmPeriodReport();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  if (!body.date) {
    return NextResponse.json({ error: "Datum verplicht" }, { status: 400 });
  }
  try {
    const row = await crmUpsertPeriodCost({
      date: String(body.date),
      adSpend: Number(body.adSpend) || 0,
      salesCost: Number(body.salesCost) || 0,
      note: body.note ?? null,
    });
    const report = await crmPeriodReport();
    return NextResponse.json({ ok: true, cost: row, report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
