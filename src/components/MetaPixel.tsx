"use client";

import { useEffect } from "react";
import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const FBC_STORAGE_KEY = "meta_fbc";
const FBC_COOKIE = "_fbc";
const FBP_COOKIE = "_fbp";
const NINETY_DAYS = 90 * 24 * 60 * 60;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

/** Meta fbc-format: fb.1.{creation_time_ms}.{fbclid} */
export function buildFbcFromFbclid(
  fbclid: string,
  creationTimeMs = Date.now(),
): string {
  return `fb.1.${creationTimeMs}.${fbclid.trim()}`;
}

/**
 * Leest fbclid uit de URL (ad-klik), zet _fbc cookie + sessionStorage,
 * zodat die later met Lead/Deal CAPI meegaat.
 */
export function captureFbclidFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid")?.trim();

  if (fbclid) {
    const existing = getCookie(FBC_COOKIE) || sessionStorage.getItem(FBC_STORAGE_KEY);
    // Alleen overschrijven als deze fbclid nog niet in bestaande fbc zit
    if (!existing || !existing.endsWith(`.${fbclid}`)) {
      const fbc = buildFbcFromFbclid(fbclid);
      setCookie(FBC_COOKIE, fbc, NINETY_DAYS);
      try {
        sessionStorage.setItem(FBC_STORAGE_KEY, fbc);
      } catch {
        /* ignore */
      }
      return fbc;
    }
    return existing;
  }

  return (
    getCookie(FBC_COOKIE) ||
    (() => {
      try {
        return sessionStorage.getItem(FBC_STORAGE_KEY);
      } catch {
        return null;
      }
    })()
  );
}

/**
 * Meta Pixel basiscode — zet _fbp/_fbc cookies voor CAPI-matching.
 * Zonder NEXT_PUBLIC_META_PIXEL_ID wordt niets geladen.
 */
export function MetaPixel() {
  useEffect(() => {
    captureFbclidFromUrl();
  }, []);

  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaBrowserEvent(
  eventName: "Lead" | "Deal",
  opts?: { eventId?: string; value?: number; currency?: string },
) {
  if (typeof window === "undefined" || !window.fbq) return;
  const params: Record<string, unknown> = {};
  if (opts?.value != null) params.value = opts.value;
  if (opts?.currency) params.currency = opts.currency;
  const eventOptions = opts?.eventId ? { eventID: opts.eventId } : undefined;
  if (eventName === "Lead") {
    window.fbq("track", "Lead", params, eventOptions);
  } else {
    window.fbq("trackCustom", "Deal", params, eventOptions);
  }
}

export function readMetaBrowserCookies(): {
  fbp: string | null;
  fbc: string | null;
  fbclid: string | null;
} {
  if (typeof document === "undefined") {
    return { fbp: null, fbc: null, fbclid: null };
  }

  const fbc = captureFbclidFromUrl();
  const fbp = getCookie(FBP_COOKIE);
  const params = new URLSearchParams(window.location.search);
  const fbclid =
    params.get("fbclid")?.trim() ||
    (fbc ? fbc.split(".").slice(3).join(".") || null : null);

  return { fbp, fbc, fbclid };
}
