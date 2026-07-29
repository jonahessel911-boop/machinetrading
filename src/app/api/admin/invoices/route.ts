import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { crmCreateInvoice, crmListAllInvoices } from "@/lib/invoices";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const invoices = await crmListAllInvoices();
    return NextResponse.json(invoices);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.buyerId) {
    return NextResponse.json({ error: "Koper is verplicht" }, { status: 400 });
  }
  if (body.amountExBtw == null || Number(body.amountExBtw) < 0) {
    return NextResponse.json(
      { error: "Bedrag excl. BTW is verplicht" },
      { status: 400 },
    );
  }

  try {
    const invoice = await crmCreateInvoice({
      buyerId: String(body.buyerId),
      leadId: body.leadId ? String(body.leadId) : null,
      description: body.description ? String(body.description) : null,
      amountExBtw: Number(body.amountExBtw),
      btwPct: body.btwPct != null ? Number(body.btwPct) : 21,
      issueDate: body.issueDate ? String(body.issueDate) : undefined,
      dueDate: body.dueDate ? String(body.dueDate) : null,
      status: body.status || "concept",
      notes: body.notes ? String(body.notes) : null,
    });
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mislukt" },
      { status: 500 },
    );
  }
}
