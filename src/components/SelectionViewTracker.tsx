"use client";

import { useEffect, useRef } from "react";

/** Telt één pageview per browser-load van de selectiepagina. */
export function SelectionViewTracker({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !slug) return;
    sent.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") return;

    void fetch(`/api/selectie/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      /* tracking mag de UI niet breken */
    });
  }, [slug]);

  return null;
}
