"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DealerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/marketplace";
  const invite = searchParams.get("invite") || "";
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteReady, setInviteReady] = useState(!invite);
  const autoLoginStarted = useRef(false);

  function safeNext(justActivated: boolean) {
    const base =
      nextPath.startsWith("/marketplace") || nextPath.startsWith("/dealer")
        ? nextPath
        : "/marketplace";
    if (!justActivated) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}activated=1`;
  }

  async function doLogin(opts: {
    user?: string;
    pass?: string;
    invite?: string;
  }) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: opts.user,
          pass: opts.pass,
          invite: opts.invite || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login mislukt");
      router.push(safeNext(Boolean(data.justActivated)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!invite || autoLoginStarted.current) return;
    autoLoginStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/dealer/invite?token=${encodeURIComponent(invite)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ongeldige link");
        if (cancelled) return;
        setUser(data.email || "");
        setPass(data.password || "");
        setInviteReady(true);
        await doLogin({ invite });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ongeldige link");
        setInviteReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on invite
  }, [invite]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin({ user, pass });
  }

  return (
    <div className="crm-login-box">
      <h1 className="crm-title">Inloggen Marketplace</h1>
      <p className="crm-subtitle">Dealer login</p>
      {!inviteReady ? (
        <p className="crm-muted" style={{ marginTop: "1.25rem" }}>
          Inloggegevens laden…
        </p>
      ) : (
        <form
          className="crm-form"
          onSubmit={onSubmit}
          style={{ marginTop: "1.25rem" }}
        >
          <label>
            E-mail
            <input
              className="crm-input"
              type="email"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="email"
              placeholder="naam@bedrijf.nl"
            />
          </label>
          <label>
            Wachtwoord
            <input
              className="crm-input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p style={{ color: "#ba0517", margin: 0, fontWeight: 700 }}>
              {error}
            </p>
          )}
          <button
            className="crm-btn crm-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Bezig…" : "Inloggen"}
          </button>
        </form>
      )}
      <p className="crm-muted" style={{ marginTop: "1rem" }}>
        <a href="/marketplace">← Terug naar marketplace</a>
      </p>
    </div>
  );
}

export default function DealerLoginPage() {
  return (
    <div className="crm-login">
      <Suspense
        fallback={
          <div className="crm-login-box">
            <h1 className="crm-title">Inloggen Marketplace</h1>
            <p className="crm-subtitle">Laden…</p>
          </div>
        }
      >
        <DealerLoginForm />
      </Suspense>
    </div>
  );
}
