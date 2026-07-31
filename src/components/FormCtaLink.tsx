"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { readMetaBrowserCookies } from "@/components/MetaPixel";

/**
 * Link naar het aanmeldformulier die fbclid meeneemt uit cookie/storage,
 * zodat de click-id niet verdwijnt tussen landingspagina en /form.
 */
export function FormCtaLink({
  href = "/form/1",
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const [url, setUrl] = useState(href);

  useEffect(() => {
    const { fbclid } = readMetaBrowserCookies();
    if (!fbclid) {
      setUrl(href);
      return;
    }
    try {
      const u = new URL(href, window.location.origin);
      if (!u.searchParams.get("fbclid")) {
        u.searchParams.set("fbclid", fbclid);
      }
      setUrl(`${u.pathname}${u.search}`);
    } catch {
      setUrl(href);
    }
  }, [href]);

  return (
    <Link href={url} className={className} prefetch={false}>
      {children}
    </Link>
  );
}
