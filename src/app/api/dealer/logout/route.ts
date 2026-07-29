import { NextResponse } from "next/server";
import { destroyDealerSession } from "@/lib/dealer-auth";

export async function POST() {
  await destroyDealerSession();
  return NextResponse.json({ ok: true });
}
