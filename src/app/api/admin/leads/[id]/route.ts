import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { MANUAL_STATUSES } from "@/lib/constants";
import {
  crmGetLead,
  crmGetLeadRow,
  crmUpdateLead,
} from "@/lib/crm";
import { statusFromAttempts } from "@/lib/status";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const existing = await crmGetLeadRow(id);
    if (!existing) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};

    if (body.action === "contact") {
      const attempts = Math.min(existing.contact_attempts + 1, 7);
      patch.contact_attempts = attempts;
      patch.status = statusFromAttempts(attempts);
    }

    if (body.status && typeof body.status === "string") {
      if (
        MANUAL_STATUSES.includes(
          body.status as (typeof MANUAL_STATUSES)[number],
        ) ||
        body.status.startsWith("contact_")
      ) {
        patch.status = body.status;
        if (body.status === "nieuw") patch.contact_attempts = 0;
        if (body.status === "geen_contact") patch.contact_attempts = 7;
        const match = /^contact_(\d)$/.exec(body.status);
        if (match) patch.contact_attempts = Number(match[1]);
      }
    }

    if ("inkoopprijs" in body) {
      patch.inkoopprijs =
        body.inkoopprijs === null || body.inkoopprijs === ""
          ? null
          : Number(body.inkoopprijs);
    }

    if ("marge" in body) {
      patch.marge =
        body.marge === null || body.marge === "" ? null : Number(body.marge);
    }

    if (
      !("nettoInkoopprijs" in body) &&
      !("netto_inkoopprijs" in body) &&
      ("inkoopprijs" in body || "marge" in body)
    ) {
      const bruto =
        "inkoopprijs" in body
          ? body.inkoopprijs === null || body.inkoopprijs === ""
            ? null
            : Number(body.inkoopprijs)
          : existing.inkoopprijs;
      const margeVal =
        "marge" in body
          ? body.marge === null || body.marge === ""
            ? null
            : Number(body.marge)
          : existing.marge;
      if (bruto != null && margeVal != null) {
        patch.netto_inkoopprijs = bruto + margeVal;
      }
    }

    if ("buyerId" in body) {
      patch.buyer_id = body.buyerId || null;
    }

    if ("straat" in body) patch.straat = body.straat || null;
    if ("huisnummer" in body) patch.huisnummer = body.huisnummer || null;
    if ("toevoeging" in body) patch.toevoeging = body.toevoeging || null;
    if ("postcode" in body) patch.postcode = body.postcode || null;
    if ("woonplaats" in body) patch.woonplaats = body.woonplaats || null;
    if ("verkoopprijs" in body) {
      patch.verkoopprijs =
        body.verkoopprijs === null || body.verkoopprijs === ""
          ? null
          : Number(body.verkoopprijs);
    }
    if ("nettoInkoopprijs" in body || "netto_inkoopprijs" in body) {
      const v = body.nettoInkoopprijs ?? body.netto_inkoopprijs;
      patch.netto_inkoopprijs = v === null || v === "" ? null : Number(v);
    }
    if ("dealDatum" in body || "deal_datum" in body) {
      const v = body.dealDatum ?? body.deal_datum;
      patch.deal_datum = v || null;
    }
    if ("bedrijfsnaam" in body) {
      patch.bedrijfsnaam = body.bedrijfsnaam
        ? String(body.bedrijfsnaam).trim()
        : null;
    }
    if ("naam" in body) patch.naam = String(body.naam).trim();
    if ("email" in body) patch.email = String(body.email).trim();
    if ("telefoon" in body) patch.telefoon = String(body.telefoon).trim();
    if ("merk" in body) patch.merk = String(body.merk).trim();
    if ("model" in body)
      patch.model = body.model ? String(body.model).trim() : null;
    if ("timing" in body) patch.timing = String(body.timing).trim();

    const lead = await crmUpdateLead(id, patch);
    if (!lead) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
