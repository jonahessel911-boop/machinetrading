import { NextResponse } from "next/server";
import { crmDeleteAdminUser } from "@/lib/admin-users";
import { getAdminSession, isAuthenticated } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const session = await getAdminSession();
  if (session?.userId === id) {
    return NextResponse.json(
      { error: "Je kunt je eigen account niet verwijderen" },
      { status: 400 },
    );
  }

  try {
    await crmDeleteAdminUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verwijderen mislukt" },
      { status: 500 },
    );
  }
}
