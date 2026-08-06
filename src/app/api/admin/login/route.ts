import { NextResponse } from "next/server";
import { authenticateAdmin, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const user = String(body.user ?? "");
  const pass = String(body.pass ?? "");

  try {
    const session = await authenticateAdmin(user, pass);
    if (!session) {
      return NextResponse.json(
        { error: "Ongeldige inloggegevens" },
        { status: 401 },
      );
    }

    await createSession({
      userId: session.userId,
      email: session.email,
      naam: session.naam,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin:login]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login mislukt" },
      { status: 500 },
    );
  }
}
