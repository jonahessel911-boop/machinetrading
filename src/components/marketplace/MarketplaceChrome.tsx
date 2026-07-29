"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DealerSession } from "@/lib/dealer-auth";

export function MarketplaceChrome({
  dealer,
  children,
  demo = false,
}: {
  dealer: DealerSession;
  children: React.ReactNode;
  demo?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/dealer/logout", { method: "POST" });
    router.push("/dealer/login");
    router.refresh();
  }

  return (
    <div className="crm-body mp-public">
      <header className="crm-global-header">
        <Link href="/marketplace" className="crm-brand">
          <span>Sales CRM</span>
        </Link>
        <nav className="crm-tabs">
          <Link href="/marketplace" className="active">
            Actieve veilingen
          </Link>
        </nav>
        <div className="crm-header-actions">
          <span className="crm-dealer-name">{dealer.bedrijf}</span>
          <button
            type="button"
            className="crm-btn crm-btn-neutral"
            onClick={logout}
          >
            Uitloggen
          </button>
        </div>
      </header>
      {demo && (
        <div className="crm-demo-banner">
          Demo-modus — login bijv. dealer / dealer123
        </div>
      )}
      <main className="crm-main">{children}</main>
    </div>
  );
}
