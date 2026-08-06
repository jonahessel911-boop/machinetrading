import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmListLeads } from "@/lib/crm";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const archive = searchParams.get("archive") === "1";
  const activeOnly = searchParams.get("active") === "1";
  const q = searchParams.get("q")?.trim();

  try {
    const { leads } = await crmListLeads({
      status,
      archive: archive || !activeOnly,
      activeOnly,
      q,
      page: 1,
      pageSize: 200,
    });
    return NextResponse.json(leads);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
