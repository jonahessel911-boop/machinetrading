import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDealerSession } from "@/lib/dealer-auth";
import { kvkBasisprofiel } from "@/lib/kvk";

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
  const kvkNummer = (searchParams.get("kvkNummer") || "").trim();
  if (!kvkNummer) {
    return NextResponse.json(
      { error: "kvkNummer is verplicht" },
      { status: 400 },
    );
  }

  try {
    const profile = await kvkBasisprofiel(kvkNummer);
    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "KvK fout" },
      { status: 502 },
    );
  }
}
