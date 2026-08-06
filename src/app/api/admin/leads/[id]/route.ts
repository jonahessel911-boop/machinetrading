import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { SELECTABLE_LEAD_STATUSES } from "@/lib/constants";
import {
  crmDeleteLead,
  crmGetLead,
  crmGetLeadRow,
  crmUpdateLead,
} from "@/lib/crm";
import { mpSyncOmschrijvingForLead } from "@/lib/marketplace-data";

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
      const prevTimes = Array.isArray(existing.contact_attempt_times)
        ? existing.contact_attempt_times.map((t) => String(t))
        : [];
      patch.contact_attempts = attempts;
      patch.contact_attempt_times = [
        ...prevTimes,
        new Date().toISOString(),
      ].slice(0, 7);
      // Contactpoging is geen status — alleen teller voor eerste belrondes.
      // Oude contact_* statuswaarden normaliseren naar nieuw.
      // Na 7 pogingen → Geen interesse.
      if (attempts >= 7) {
        patch.status = "geen_interesse";
      } else if (String(existing.status).startsWith("contact_")) {
        patch.status = "nieuw";
      }
    }

    if (body.status && typeof body.status === "string") {
      const nextStatus =
        body.status === "in_bemiddeling" ? "koper_zoeken" : body.status;
      const allowed =
        SELECTABLE_LEAD_STATUSES.includes(
          nextStatus as (typeof SELECTABLE_LEAD_STATUSES)[number],
        ) || /^contact_[1-7]$/.test(nextStatus);
      if (!allowed) {
        return NextResponse.json(
          { error: `Ongeldige status: ${body.status}` },
          { status: 400 },
        );
      }
      patch.status = nextStatus;
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
    if ("verkoopmedewerker" in body) {
      patch.verkoopmedewerker = body.verkoopmedewerker
        ? String(body.verkoopmedewerker).trim()
        : null;
    }
    if ("naam" in body) patch.naam = String(body.naam).trim();
    if ("email" in body) patch.email = String(body.email).trim().toLowerCase();
    if ("telefoon" in body) patch.telefoon = String(body.telefoon).trim();
    if ("merk" in body) patch.merk = String(body.merk).trim();
    if ("model" in body)
      patch.model = body.model ? String(body.model).trim() : null;
    if ("timing" in body) patch.timing = String(body.timing).trim();
    if ("omschrijving" in body) {
      patch.omschrijving = body.omschrijving
        ? String(body.omschrijving).trim().slice(0, 2000)
        : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Geen wijzigingen om op te slaan" },
        { status: 400 },
      );
    }

    const lead = await crmUpdateLead(id, patch);
    if (!lead) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    if ("omschrijving" in patch) {
      await mpSyncOmschrijvingForLead(
        id,
        (patch.omschrijving as string | null) ?? null,
      );
    }
    return NextResponse.json(lead);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fout";
    const friendly = /leads_status_check|check constraint/i.test(message)
      ? "Status niet toegestaan in de database. Draai migratie 025_status_onrealistische_prijs.sql in Supabase."
      : message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const existing = await crmGetLeadRow(id);
    if (!existing) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    await crmDeleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verwijderen mislukt" },
      { status: 500 },
    );
  }
}
