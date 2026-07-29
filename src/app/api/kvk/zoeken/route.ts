import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDealerSession } from "@/lib/dealer-auth";
import { kvkZoeken } from "@/lib/kvk";

async function allowed() {
  if (await isAuthenticated()) return true;
  if (await getDealerSession()) return true;
  return false;
}

export async function GET(request: Request) {
  if (!(await allowed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || searchParams.get("naam") || "").trim();
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await kvkZoeken(q);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "KvK fout" },
      { status: 502 },
    );
  }
}
