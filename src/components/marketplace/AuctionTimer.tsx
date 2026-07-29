"use client";

import { useEffect, useState } from "react";
import {
  formatRemainingPrecise,
  formatRemainingRounded,
} from "@/lib/auction-time";

export function AuctionTimer({
  endsAt,
  precise = false,
}: {
  endsAt: string;
  precise?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const label = precise
    ? formatRemainingPrecise(endsAt, now)
    : formatRemainingRounded(endsAt, now);

  return <span className="mp-timer">{label}</span>;
}
