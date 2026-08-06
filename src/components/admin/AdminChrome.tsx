"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminChrome({
  children,
  demo = false,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="crm-shell">
      <header className="crm-global-header">
        <Link href="/admin" className="crm-brand">
          <span>Sales CRM</span>
        </Link>
        <nav className="crm-tabs">
          <Link
            href="/admin"
            className={pathname === "/admin" ? "active" : ""}
          >
            Home
          </Link>
          <Link
            href="/admin/leads"
            className={isActive("/admin/leads") ? "active" : ""}
          >
            Leads
          </Link>
          <Link
            href="/admin/bel-systeem"
            className={isActive("/admin/bel-systeem") ? "active" : ""}
          >
            Bel systeem
          </Link>
          <Link
            href="/admin/kopers"
            className={isActive("/admin/kopers") ? "active" : ""}
          >
            Kopers
          </Link>
          <Link
            href="/admin/selecties"
            className={isActive("/admin/selecties") ? "active" : ""}
          >
            Selecties
          </Link>
          <Link
            href="/admin/marketplace"
            className={isActive("/admin/marketplace") ? "active" : ""}
          >
            Marketplace
          </Link>
          <Link
            href="/admin/rapportage"
            className={isActive("/admin/rapportage") ? "active" : ""}
          >
            Rapportage
          </Link>
          <Link
            href="/admin/lead-cr"
            className={isActive("/admin/lead-cr") ? "active" : ""}
          >
            Lead CR
          </Link>
          <Link
            href="/admin/users"
            className={isActive("/admin/users") ? "active" : ""}
          >
            Users
          </Link>
          <Link
            href="/admin/instellingen"
            className={isActive("/admin/instellingen") ? "active" : ""}
          >
            Instellingen
          </Link>
        </nav>
        <div className="crm-header-actions">
          <input
            className="crm-search"
            placeholder="Zoeken…"
            aria-label="Zoeken"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const q = (e.target as HTMLInputElement).value.trim();
                if (q)
                  window.location.href = `/admin/leads?q=${encodeURIComponent(q)}`;
              }
            }}
          />
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
          Demo-modus — geen Supabase gekoppeld. Data staat alleen lokaal in
          geheugen.
        </div>
      )}
      <div className="crm-main">{children}</div>
    </div>
  );
}
