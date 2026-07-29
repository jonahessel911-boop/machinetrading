import { NextResponse } from "next/server";
import { createSession, validateCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const user = String(body.user ?? "");
  const pass = String(body.pass ?? "");

  if (!validateCredentials(user, pass)) {
    return NextResponse.json(
      { error: "Ongeldige inloggegevens" },
      { status: 401 },
    );
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
