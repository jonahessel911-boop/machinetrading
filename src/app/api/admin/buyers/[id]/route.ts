import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmDeleteBuyer, crmUpdateBuyer } from "@/lib/crm";
import { getDemoStore, isDemoMode } from "@/lib/demo-store";
import { hashPassword } from "@/lib/password";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = {};

  if (body.naam !== undefined) patch.naam = String(body.naam).trim();
  if (body.bedrijf !== undefined) patch.bedrijf = String(body.bedrijf).trim();
  if (body.email !== undefined) {
    patch.email = body.email ? String(body.email).trim() : null;
  }
  if (body.telefoon !== undefined) {
    patch.telefoon = body.telefoon ? String(body.telefoon).trim() : null;
  }

  if (body.dealerUsername !== undefined) {
    const username = body.dealerUsername
      ? String(body.dealerUsername).trim()
      : null;
    if (username && isDemoMode()) {
      const taken = getDemoStore().buyers.some(
        (b) =>
          b.id !== id &&
          b.dealer_username?.toLowerCase() === username.toLowerCase(),
      );
      if (taken) {
        return NextResponse.json(
          { error: "Dit e-mailadres heeft al een dealer-login" },
          { status: 400 },
        );
      }
    }
    patch.dealer_username = username;
  }

  if (body.dealerPassword) {
    patch.dealer_password_hash = hashPassword(String(body.dealerPassword));
  }

  if (body.dealerEnabled !== undefined) {
    patch.dealer_enabled = Boolean(body.dealerEnabled);
  }

  if ("notities" in body) {
    patch.notities =
      typeof body.notities === "string"
        ? body.notities.trim().slice(0, 8000) || null
        : null;
  }

  if (body.dailyDigest !== undefined) {
    patch.daily_digest = Boolean(body.dailyDigest);
  }

  if (
    patch.dealer_username === null ||
    (body.dealerEnabled === false && !body.dealerUsername)
  ) {
    if (body.clearDealerLogin) {
      patch.dealer_username = null;
      patch.dealer_password_hash = null;
      patch.dealer_enabled = false;
    }
  }

  try {
    const buyer = await crmUpdateBuyer(id, patch);
    if (!buyer) {
      return NextResponse.json({ error: "Mislukt" }, { status: 500 });
    }
    return NextResponse.json(buyer);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mislukt" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await crmDeleteBuyer(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
