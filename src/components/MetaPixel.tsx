"use client";

import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Meta Pixel basiscode — zet _fbp/_fbc cookies voor CAPI-matching.
 * Zonder NEXT_PUBLIC_META_PIXEL_ID wordt niets geladen.
 */
export function MetaPixel() {
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
} {
  if (typeof document === "undefined") return { fbp: null, fbc: null };
  const get = (name: string) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };
  return { fbp: get("_fbp"), fbc: get("_fbc") };
}
