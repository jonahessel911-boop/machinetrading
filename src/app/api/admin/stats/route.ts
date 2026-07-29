import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmStats } from "@/lib/crm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await crmStats();
    return NextResponse.json({
      totalLeads: stats.totalLeads,
      deals: stats.deals,
      conversie: stats.conversie,
      omzet: stats.winst,
      winst: stats.winst,
      byStatus: stats.byStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
