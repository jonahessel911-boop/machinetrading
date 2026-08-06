"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MarketplaceListing } from "@/lib/marketplace";
import { listingTitle } from "@/lib/marketplace";

type InviteInfo = {
  email: string;
  bedrijf: string;
  naam: string;
  dealCount: number;
  activated: boolean;
  hasPassword: boolean;
};

const STEPS = [
  {
    title: "Je biedt op dit platform",
    body: (
      <>
        <p>
          Bekijk de foto&apos;s en de informatie van elke heftruck. Heb je een
          vraag over een truck? Bel het nummer dat erbij staat — een medewerker
          neemt direct contact op om al je vragen te beantwoorden.
        </p>
      </>
    ),
  },
  {
    title: "Ons verdienmodel",
    body: (
      <>
        <p>
          Jij betaalt ons niks als er niks ingekocht wordt. Onze fee zit in het
          verschil tussen jouw bod en de prijs waarop wij de heftruck kunnen
          krijgen.
        </p>
        <div className="dealer-onboard-example">
          <p>
            <strong>Voorbeeld</strong>
          </p>
          <ul>
            <li>Jij biedt €3.000</li>
            <li>Wij bieden de verkoper €2.700</li>
            <li>Verkoper gaat akkoord</li>
            <li>
              Jij krijgt na het ophalen een factuur van €300 van ons
            </li>
          </ul>
        </div>
      </>
    ),
  },
  {
    title: "Koopovereenkomst",
    body: (
      <>
        <p>
          Nadat het bod akkoord is voor de verkoper, sturen wij een
          koopovereenkomst. Hierin staan de gegevens van de verkoper, de koper
          en van ons.
        </p>
        <p>
          Zodra de koopovereenkomst verstuurd is, is de deal bindend — koper en
          verkoper kunnen niet meer terug (mits de heftruck bij ophalen is zoals
          omschreven).
        </p>
      </>
    ),
  },
] as const;

function BlurredDeals({ listings }: { listings: MarketplaceListing[] }) {
  const cards =
    listings.length > 0
      ? listings.slice(0, 9)
      : Array.from({ length: 6 }, (_, i) => null);

  return (
    <div className="dealer-onboard-bg" aria-hidden>
      <div className="dealer-onboard-bg-grid">
        {cards.map((listing, i) => {
          const photo = listing?.photos?.[0]?.url;
          return (
            <div key={listing?.id ?? `ph-${i}`} className="dealer-onboard-bg-card">
              <div className="dealer-onboard-bg-thumb">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" />
                ) : (
                  <div className="dealer-onboard-bg-ph" />
                )}
              </div>
              <div className="dealer-onboard-bg-meta">
                <strong>
                  {listing ? listingTitle(listing) : "Heftruck"}
                </strong>
                <span>{listing?.woonplaats || "Nederland"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="dealer-onboard-bg-veil" />
    </div>
  );
}

function OnboardingInner({
  listings,
  phone,
  phoneTel,
}: {
  listings: MarketplaceListing[];
  phone: string;
  phoneTel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") || "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  /** 0..2 = content steps, 3 = password */
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!invite) {
      setLoadError("Geen uitnodigingslink. Vraag een nieuwe mail aan.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/dealer/invite?token=${encodeURIComponent(invite)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ongeldige link");
        if (cancelled) return;
        if (data.activated && data.hasPassword) {
          router.replace("/dealer/login");
          return;
        }
        setInfo({
          email: data.email,
          bedrijf: data.bedrijf,
          naam: data.naam,
          dealCount: Number(data.dealCount) || listings.length,
          activated: Boolean(data.activated),
          hasPassword: Boolean(data.hasPassword),
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Kon uitnodiging niet laden",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invite, listings.length, router]);

  const dealCount = info?.dealCount ?? listings.length;
  const dealLabel =
    dealCount <= 0
      ? "Deals zien"
      : dealCount === 1
        ? "1 deal zien"
        : `${dealCount} deals zien`;

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setBusy(true);
    setFormError("");
    try {
      const res = await fetch("/api/dealer/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite,
          password,
          passwordConfirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activeren mislukt");
      router.push(
        data.justActivated ? "/marketplace?activated=1" : "/marketplace",
      );
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Activeren mislukt");
      setBusy(false);
    }
  }

  return (
    <div className="dealer-onboard">
      <BlurredDeals listings={listings} />
      <div className="dealer-onboard-panel">
        {loading ? (
          <p className="crm-muted">Uitnodiging laden…</p>
        ) : loadError ? (
          <>
            <h1 className="dealer-onboard-title">Link niet geldig</h1>
            <p className="dealer-onboard-copy">{loadError}</p>
            <a className="crm-btn crm-btn-primary" href="/dealer/login">
              Naar inloggen
            </a>
          </>
        ) : info ? (
          <>
            <p className="dealer-onboard-kicker">Marketplace</p>
            <h1 className="dealer-onboard-title">Welkom {info.bedrijf}</h1>

            {step < STEPS.length ? (
              <>
                <div className="dealer-onboard-progress" aria-hidden>
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`dealer-onboard-dot${i === step ? " is-active" : ""}${i < step ? " is-done" : ""}`}
                    />
                  ))}
                </div>
                <h2 className="dealer-onboard-step-title">
                  {STEPS[step].title}
                </h2>
                <div className="dealer-onboard-copy">{STEPS[step].body}</div>
                {step === 0 ? (
                  <p className="dealer-onboard-phone">
                    Vragen? Bel{" "}
                    <a href={`tel:${phoneTel}`}>{phone}</a>
                  </p>
                ) : null}
                <button
                  type="button"
                  className="crm-btn crm-btn-primary dealer-onboard-cta"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Doorgaan
                </button>
              </>
            ) : (
              <form className="dealer-onboard-form" onSubmit={activate}>
                <p className="dealer-onboard-copy">
                  Vul je wachtwoord in om de deals te zien.
                </p>
                <p className="dealer-onboard-email">
                  Je account e-mail is: <strong>{info.email}</strong>
                </p>
                <label>
                  Wachtwoord
                  <input
                    className="crm-input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimaal 8 tekens"
                  />
                </label>
                <label>
                  Bevestig wachtwoord
                  <input
                    className="crm-input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </label>
                {formError ? (
                  <p className="dealer-onboard-error">{formError}</p>
                ) : null}
                <button
                  type="submit"
                  className="crm-btn crm-btn-primary dealer-onboard-cta"
                  disabled={busy}
                >
                  {busy ? "Bezig…" : dealLabel}
                </button>
                <button
                  type="button"
                  className="crm-btn dealer-onboard-back"
                  disabled={busy}
                  onClick={() => setStep(STEPS.length - 1)}
                >
                  ← Terug
                </button>
              </form>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function DealerOnboardingClient({
  listings,
  phone,
  phoneTel,
}: {
  listings: MarketplaceListing[];
  phone: string;
  phoneTel: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="dealer-onboard">
          <BlurredDeals listings={listings} />
          <div className="dealer-onboard-panel">
            <p className="crm-muted">Laden…</p>
          </div>
        </div>
      }
    >
      <OnboardingInner
        listings={listings}
        phone={phone}
        phoneTel={phoneTel}
      />
    </Suspense>
  );
}
