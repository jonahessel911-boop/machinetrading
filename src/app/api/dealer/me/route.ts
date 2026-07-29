import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-auth";

export async function GET() {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, dealer: session });
}
