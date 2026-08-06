import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  crmGetLatestLeadTaxatie,
  crmSaveLeadTaxatie,
} from "@/lib/lead-taxaties";
import { runTaxatieWithOpenAI, type TaxatieInput } from "@/lib/taxatie";

export const maxDuration = 120;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseInput(body: Record<string, unknown>): TaxatieInput {
  return {
    merk: str(body.merk),
    model: str(body.model),
    bouwjaar: str(body.bouwjaar),
    draaiuren: str(body.draaiuren),
    aandrijving: str(body.aandrijving),
    capaciteitKg: str(body.capaciteitKg),
    hefhoogteMm: str(body.hefhoogteMm),
    mast: str(body.mast),
    uitvoering: str(body.uitvoering),
    banden: str(body.banden),
    accuInfo: str(body.accuInfo),
    locatie: str(body.locatie),
    verkoperRichtprijs: str(body.verkoperRichtprijs),
    bekendeGebreken: str(body.bekendeGebreken),
    extraNotities: str(body.extraNotities),
    omschrijving: str(body.omschrijving),
    photoId: str(body.photoId) || undefined,
    photoUrl: str(body.photoUrl) || undefined,
  };
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leadId = new URL(request.url).searchParams.get("leadId")?.trim();
  if (!leadId) {
    return NextResponse.json({ error: "leadId verplicht" }, { status: 400 });
  }

  try {
    const saved = await crmGetLatestLeadTaxatie(leadId);
    return NextResponse.json({ ok: true, taxatie: saved });
  } catch (err) {
    console.error("[taxatie get]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ophalen mislukt" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseInput(body);
    const leadId = str(body.leadId);

    if (!input.merk && !input.model && !input.photoUrl) {
      return NextResponse.json(
        { error: "Vul minimaal merk/model in of selecteer een foto" },
        { status: 400 },
      );
    }

    const taxatie = await runTaxatieWithOpenAI(input);

    let savedId: string | null = null;
    if (leadId) {
      try {
        const saved = await crmSaveLeadTaxatie({
          leadId,
          form: input,
          result: taxatie,
        });
        savedId = saved.id;
      } catch (saveErr) {
        console.error("[taxatie save]", saveErr);
        // Taxatie zelf is gelukt; opslaan is best-effort met melding
        return NextResponse.json({
          ok: true,
          taxatie,
          saved: false,
          warning:
            saveErr instanceof Error
              ? `Taxatie gelukt, opslaan mislukt: ${saveErr.message}`
              : "Taxatie gelukt, opslaan mislukt",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      taxatie,
      saved: Boolean(savedId),
      savedId,
    });
  } catch (err) {
    console.error("[taxatie]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Taxatie mislukt",
      },
      { status: 500 },
    );
  }
}
