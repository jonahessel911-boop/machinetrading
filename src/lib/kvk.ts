export type KvkSearchHit = {
  kvkNummer: string;
  vestigingsnummer: string | null;
  naam: string;
  type: string | null;
  straatnaam: string | null;
  huisnummer: string | null;
  huisletter: string | null;
  postcode: string | null;
  plaats: string | null;
  label: string;
};

export type KvkCompanyProfile = {
  kvkNummer: string;
  naam: string;
  straat: string | null;
  huisnummer: string | null;
  postcode: string | null;
  woonplaats: string | null;
  land: string | null;
  vestigingsnummer: string | null;
};

function kvkKey() {
  const key = process.env.KVK_API_KEY;
  if (!key) throw new Error("KVK_API_KEY ontbreekt in .env");
  return key;
}

function mapAdres(adres: unknown): {
  straatnaam: string | null;
  huisnummer: string | null;
  huisletter: string | null;
  postcode: string | null;
  plaats: string | null;
} {
  const a = adres as {
    binnenlandsAdres?: {
      straatnaam?: string;
      huisnummer?: number | string;
      huisletter?: string;
      postcode?: string;
      plaats?: string;
    };
  } | null;
  const b = a?.binnenlandsAdres;
  if (!b) {
    return {
      straatnaam: null,
      huisnummer: null,
      huisletter: null,
      postcode: null,
      plaats: null,
    };
  }
  return {
    straatnaam: b.straatnaam ?? null,
    huisnummer: b.huisnummer != null ? String(b.huisnummer) : null,
    huisletter: b.huisletter ?? null,
    postcode: b.postcode ?? null,
    plaats: b.plaats ?? null,
  };
}

export async function kvkZoeken(naam: string): Promise<KvkSearchHit[]> {
  const q = naam.trim();
  if (q.length < 2) return [];

  const url = new URL("https://api.kvk.nl/api/v2/zoeken");
  url.searchParams.set("naam", q);
  url.searchParams.set("resultatenPerPagina", "10");

  const res = await fetch(url.toString(), {
    headers: { apikey: kvkKey() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KvK zoeken mislukt (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    resultaten?: Array<{
      kvkNummer?: string;
      vestigingsnummer?: string;
      naam?: string;
      type?: string;
      adres?: unknown;
    }>;
  };

  return (data.resultaten ?? [])
    .filter((r) => r.kvkNummer && r.naam)
    .map((r) => {
      const addr = mapAdres(r.adres);
      const parts = [
        r.naam,
        addr.plaats,
        `KvK ${r.kvkNummer}`,
      ].filter(Boolean);
      return {
        kvkNummer: r.kvkNummer!,
        vestigingsnummer: r.vestigingsnummer ?? null,
        naam: r.naam!,
        type: r.type ?? null,
        straatnaam: addr.straatnaam,
        huisnummer: addr.huisnummer
          ? `${addr.huisnummer}${addr.huisletter ?? ""}`
          : null,
        huisletter: addr.huisletter,
        postcode: addr.postcode,
        plaats: addr.plaats,
        label: parts.join(" · "),
      };
    });
}

export async function kvkBasisprofiel(
  kvkNummer: string,
): Promise<KvkCompanyProfile> {
  const nr = kvkNummer.replace(/\D/g, "");
  if (nr.length !== 8) throw new Error("Ongeldig KvK-nummer");

  const res = await fetch(
    `https://api.kvk.nl/api/v1/basisprofielen/${nr}`,
    {
      headers: { apikey: kvkKey() },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `KvK basisprofiel mislukt (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    kvkNummer?: string;
    naam?: string;
    _embedded?: {
      hoofdvestiging?: {
        vestigingsnummer?: string;
        eersteHandelsnaam?: string;
        adressen?: Array<{
          type?: string;
          straatnaam?: string;
          huisnummer?: number | string;
          huisletter?: string;
          postcode?: string;
          plaats?: string;
          land?: string;
        }>;
      };
    };
  };

  const hv = data._embedded?.hoofdvestiging;
  const adres =
    hv?.adressen?.find((a) => a.type === "bezoekadres") ||
    hv?.adressen?.[0];

  const huisnummer =
    adres?.huisnummer != null
      ? `${adres.huisnummer}${adres.huisletter ?? ""}`
      : null;

  return {
    kvkNummer: data.kvkNummer || nr,
    naam: data.naam || hv?.eersteHandelsnaam || "",
    straat: adres?.straatnaam ?? null,
    huisnummer,
    postcode: adres?.postcode ?? null,
    woonplaats: adres?.plaats ?? null,
    land: adres?.land ?? "Nederland",
    vestigingsnummer: hv?.vestigingsnummer ?? null,
  };
}
