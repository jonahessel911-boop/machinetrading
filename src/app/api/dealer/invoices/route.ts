import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/dealer-auth";
import { crmListInvoicesForBuyer } from "@/lib/invoices";

export async function GET() {
  const dealer = await getDealerSession();
  if (!dealer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await crmListInvoicesForBuyer(dealer.buyerId, {
      includeDrafts: false,
    });
    return NextResponse.json(invoices);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}
