import { NextResponse } from "next/server";
import { crmCreateLead } from "@/lib/crm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merk, model, timing, naam, email, telefoon, woonplaats } = body;

    if (!merk || !timing || !naam || !email || !telefoon || !woonplaats) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in." },
        { status: 400 },
      );
    }

    const lead = await crmCreateLead({
      merk: String(merk),
      model: model ? String(model) : "Onbekend",
      timing: String(timing),
      naam: String(naam).trim(),
      email: String(email).trim(),
      telefoon: String(telefoon).trim(),
      woonplaats: String(woonplaats).trim(),
    });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kon lead niet opslaan.",
      },
      { status: 500 },
    );
  }
}
