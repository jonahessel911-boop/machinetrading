import { NextResponse } from "next/server";
import { verifyDealerInviteToken } from "@/lib/dealer-auth";

/** Decode invite token for autofill on login page (e-mail + wachtwoord). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  if (!token) {
    return NextResponse.json({ error: "Geen token" }, { status: 400 });
  }

  const payload = await verifyDealerInviteToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Uitnodigingslink is ongeldig of verlopen" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    email: payload.email,
    password: payload.password,
  });
}
