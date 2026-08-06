import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmReorderLeadPhotos } from "@/lib/lead-photos";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leadId } = await params;

  try {
    const body = (await request.json()) as { photoIds?: string[] };
    const photoIds = Array.isArray(body.photoIds) ? body.photoIds : [];
    const photos = await crmReorderLeadPhotos(leadId, photoIds);
    return NextResponse.json({ ok: true, photos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sorteren mislukt" },
      { status: 400 },
    );
  }
}
