import { NextResponse } from "next/server";
import { crmRecordSelectionView } from "@/lib/selections";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: raw } = await params;
    const slug = decodeURIComponent(raw);
    await crmRecordSelectionView(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[selectie:view]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
