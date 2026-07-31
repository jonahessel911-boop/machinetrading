"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { DealerSession } from "@/lib/dealer-auth";

export function MarketplaceChrome({
  dealer,
  children,
  demo = false,
}: {
  dealer: DealerSession | null;
  children: React.ReactNode;
  demo?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isGuest = !dealer;

  function isActive(href: string) {
    if (href === "/marketplace") {
      return pathname === "/marketplace" || pathname.startsWith("/marketplace/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function veilingenActive() {
    if (pathname === "/marketplace") return true;
    if (pathname.startsWith("/marketplace/facturen")) return false;
    if (pathname.startsWith("/marketplace/instellingen")) return false;
    return pathname.startsWith("/marketplace/");
  }

  async function logout() {
    await fetch("/api/dealer/logout", { method: "POST" });
    router.push("/marketplace");
    router.refresh();
  }

  const loginHref = `/dealer/login?next=${encodeURIComponent(pathname || "/marketplace")}`;

  return (
    <div className="crm-body mp-public">
      <header className="crm-global-header">
        <Link href="/marketplace" className="crm-brand">
          <span>Marketplace</span>
        </Link>
        <nav className="crm-tabs">
          <Link
            href="/marketplace"
            className={veilingenActive() ? "active" : ""}
          >
            Actieve veilingen
          </Link>
          {!isGuest && (
            <>
              <Link
                href="/marketplace/facturen"
                className={isActive("/marketplace/facturen") ? "active" : ""}
              >
                Facturen
              </Link>
              <Link
                href="/marketplace/instellingen"
                className={
                  isActive("/marketplace/instellingen") ? "active" : ""
                }
              >
                Instellingen
              </Link>
            </>
          )}
        </nav>
        <div className="crm-header-actions">
          {isGuest ? (
            <Link href={loginHref} className="crm-btn crm-btn-primary">
              Inloggen
            </Link>
          ) : (
            <>
              <span className="crm-dealer-name">{dealer.bedrijf}</span>
              <button
                type="button"
                className="crm-btn crm-btn-neutral"
                onClick={logout}
              >
                Uitloggen
              </button>
            </>
          )}
        </div>
      </header>
      {demo && (
        <div className="crm-demo-banner">
          Demo-modus — geen Supabase gekoppeld (lege lokale store).
        </div>
      )}
      {isGuest && (
        <div className="mp-guest-banner">
          Je bekijkt als gast.{" "}
          <Link href={loginHref}>Log in</Link> om prijzen, biedingen en
          beschrijvingen te zien en te bieden.
        </div>
      )}
      <main className="crm-main">{children}</main>
    </div>
  );
}
