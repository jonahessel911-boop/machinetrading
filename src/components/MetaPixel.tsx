"use client";

import { useEffect } from "react";
import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

const FBC_COOKIE = "_fbc";
const FBP_COOKIE = "_fbp";
const LS_FBC = "meta_fbc";
const LS_FBCLID = "meta_fbclid";
const LS_FBP = "meta_fbp";
const NINETY_DAYS = 90 * 24 * 60 * 60;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function setCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  // Geen encodeURIComponent: Meta verwacht _fbc/_fbp in plain format
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function ssGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function ssSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Meta fbc-format: fb.1.{creation_time_ms}.{fbclid} */
export function buildFbcFromFbclid(
  fbclid: string,
  creationTimeMs = Date.now(),
): string {
  return `fb.1.${creationTimeMs}.${fbclid.trim()}`;
}

function fbclidFromFbc(fbc: string | null | undefined): string | null {
  if (!fbc?.startsWith("fb.")) return null;
  const parts = fbc.split(".");
  // fb.1.{ts}.{fbclid...} — fbclid mag zelf punten bevatten
  if (parts.length < 4) return null;
  return parts.slice(3).join(".") || null;
}

function isValidFbc(value: string | null | undefined): value is string {
  return Boolean(value && /^fb\.\d+\.\d+\./.test(value));
}

function isValidFbp(value: string | null | undefined): value is string {
  return Boolean(value && /^fb\.\d+\.\d+\.\d+$/.test(value));
}

/** Zorgt dat er altijd een _fbp is (Pixel of synthetisch). */
export function ensureFbp(): string | null {
  if (typeof document === "undefined") return null;
  const existing =
    getCookie(FBP_COOKIE) || lsGet(LS_FBP) || ssGet(LS_FBP);
  if (isValidFbp(existing)) {
    setCookie(FBP_COOKIE, existing, NINETY_DAYS);
    lsSet(LS_FBP, existing);
    return existing;
  }
  const generated = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
  setCookie(FBP_COOKIE, generated, NINETY_DAYS);
  lsSet(LS_FBP, generated);
  ssSet(LS_FBP, generated);
  return generated;
}

function persistFbc(fbc: string, fbclid: string) {
  setCookie(FBC_COOKIE, fbc, NINETY_DAYS);
  lsSet(LS_FBC, fbc);
  lsSet(LS_FBCLID, fbclid);
  ssSet(LS_FBC, fbc);
  ssSet(LS_FBCLID, fbclid);
}

/**
 * Leest/zet fbclid uit URL + herstelt uit cookie/localStorage/sessionStorage.
 * Aanroepen zo vroeg mogelijk (landingspagina + voor lead-submit).
 */
export function captureFbclidFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const urlFbclid = params.get("fbclid")?.trim() || null;

  const storedFbc =
    [getCookie(FBC_COOKIE), lsGet(LS_FBC), ssGet(LS_FBC)].find(isValidFbc) ||
    null;
  const storedFbclid =
    urlFbclid ||
    lsGet(LS_FBCLID) ||
    ssGet(LS_FBCLID) ||
    fbclidFromFbc(storedFbc);

  if (urlFbclid) {
    // Bestaande fbc behouden als die al bij deze fbclid hoort (originele timestamp)
    if (storedFbc && fbclidFromFbc(storedFbc) === urlFbclid) {
      persistFbc(storedFbc, urlFbclid);
      return storedFbc;
    }
    const fbc = buildFbcFromFbclid(urlFbclid);
    persistFbc(fbc, urlFbclid);
    return fbc;
  }

  if (storedFbc) {
    const id = fbclidFromFbc(storedFbc);
    if (id) persistFbc(storedFbc, id);
    return storedFbc;
  }

  if (storedFbclid) {
    const fbc = buildFbcFromFbclid(storedFbclid);
    persistFbc(fbc, storedFbclid);
    return fbc;
  }

  return null;
}

/**
 * Inline script (beforeInteractive): vangt fbclid vóór React-hydratie,
 * zodat een snelle klik op "Meld aan" de click-id niet mist.
 */
export const META_FBC_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var NINETY = 90 * 24 * 60 * 60;
    var params = new URLSearchParams(location.search);
    var fbclid = (params.get("fbclid") || "").trim();
    function setC(n, v) {
      var secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = n + "=" + v + "; path=/; max-age=" + NINETY + "; SameSite=Lax" + secure;
    }
    function getC(n) {
      var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    }
    function ls(k, v) { try { if (v != null) localStorage.setItem(k, v); return localStorage.getItem(k); } catch (e) { return null; } }
    function ss(k, v) { try { if (v != null) sessionStorage.setItem(k, v); return sessionStorage.getItem(k); } catch (e) { return null; } }
    if (fbclid) {
      var existing = getC("_fbc") || ls("meta_fbc") || ss("meta_fbc");
      var fbc = existing && existing.indexOf("." + fbclid) === existing.length - ("." + fbclid).length
        ? existing
        : "fb.1." + Date.now() + "." + fbclid;
      setC("_fbc", fbc);
      ls("meta_fbc", fbc);
      ls("meta_fbclid", fbclid);
      ss("meta_fbc", fbc);
      ss("meta_fbclid", fbclid);
    }
  } catch (e) {}
})();
`;

/**
 * Meta Pixel basiscode — zet _fbp/_fbc cookies voor CAPI-matching.
 * fbc-bootstrap draait altijd; pixel alleen met NEXT_PUBLIC_META_PIXEL_ID.
 */
export function MetaPixel() {
  useEffect(() => {
    captureFbclidFromUrl();
    ensureFbp();
  }, []);

  return (
    <>
      <Script id="meta-fbc-bootstrap" strategy="beforeInteractive">
        {META_FBC_BOOTSTRAP_SCRIPT}
      </Script>
      {PIXEL_ID ? (
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
      ) : null}
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
  if (typeof window === "undefined" || !window.fbq || !opts?.eventId) return;
  const params: Record<string, unknown> = {};
  if (opts.value != null) params.value = opts.value;
  if (opts.currency) params.currency = opts.currency;
  // eventID (camelCase + capital ID) moet exact matchen met CAPI event_id
  const eventData = { eventID: opts.eventId };
  if (eventName === "Lead") {
    window.fbq("track", "Lead", params, eventData);
  } else {
    window.fbq("trackCustom", "Deal", params, eventData);
  }
}

/** Unieke id voor Pixel + CAPI deduplicatie (zelfde string aan beide kanten). */
export function createMetaEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  const fbp = ensureFbp();
  const fbclid =
    new URLSearchParams(window.location.search).get("fbclid")?.trim() ||
    lsGet(LS_FBCLID) ||
    ssGet(LS_FBCLID) ||
    fbclidFromFbc(fbc);

  return { fbp, fbc, fbclid };
}
