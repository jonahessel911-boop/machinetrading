import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmGetLead } from "@/lib/crm";
import {
  leadMessageEmail,
  portalReplyTo,
  sendEmail,
} from "@/lib/email";
import {
  crmInsertLeadMessage,
  crmListLeadMessages,
} from "@/lib/lead-messages";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }
    const messages = await crmListLeadMessages(id);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await crmGetLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const body = await request.json();
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const messageBody =
      typeof body.body === "string" ? body.body.trim() : "";

    if (!subject) {
      return NextResponse.json(
        { error: "Onderwerp is verplicht" },
        { status: 400 },
      );
    }
    if (!messageBody) {
      return NextResponse.json(
        { error: "Bericht is verplicht" },
        { status: 400 },
      );
    }

    const to = lead.email?.trim();
    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { error: "Lead heeft geen geldig e-mailadres" },
        { status: 400 },
      );
    }

    const mail = leadMessageEmail({ subject, body: messageBody });
    const sent = await sendEmail({
      to,
      replyTo: portalReplyTo(),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error || "E-mail versturen mislukt" },
        { status: 502 },
      );
    }

    const saved = await crmInsertLeadMessage({
      leadId: lead.id,
      subject: mail.subject,
      body: messageBody,
      toEmail: to,
    });

    return NextResponse.json({
      ok: true,
      message: saved,
      mode: sent.mode,
    });
  } catch (err) {
    console.error("[admin:lead-message]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
