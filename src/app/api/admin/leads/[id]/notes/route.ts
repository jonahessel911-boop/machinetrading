import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { crmGetLead } from "@/lib/crm";
import {
  crmDeleteLeadNote,
  crmInsertLeadNote,
  crmListLeadNotes,
} from "@/lib/lead-notes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }
    const notes = await crmListLeadNotes(id);
    return NextResponse.json({ notes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const body = await request.json();
    const noteBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!noteBody) {
      return NextResponse.json(
        { error: "Notitie mag niet leeg zijn" },
        { status: 400 },
      );
    }

    const note = await crmInsertLeadNote({
      leadId: lead.id,
      body: noteBody,
      authorNaam: session.naam || session.email || "Medewerker",
      authorUserId: session.userId,
    });

    return NextResponse.json({ ok: true, note });
  } catch (err) {
    console.error("[admin:lead-note]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const url = new URL(request.url);
    const noteId = url.searchParams.get("noteId")?.trim() || "";
    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is verplicht" },
        { status: 400 },
      );
    }

    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const deleted = await crmDeleteLeadNote(id, noteId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Notitie niet gevonden" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
