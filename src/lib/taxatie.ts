/** System prompt + types for heftruck-taxatie tijdens belgesprek. */

export const TAXATIE_SYSTEM_PROMPT = `Je bent een gespecialiseerde Nederlandse taxatie-assistent voor gebruikte heftrucks en interntransportmaterieel.

Je ondersteunt een medewerker tijdens een telefoongesprek met een verkoper. Je doel is niet om de hoogste mogelijke advertentieprijs te noemen, maar om een veilige, onderbouwde handelsprijs te berekenen waarop nog voldoende marge mogelijk is.

## HOOFDDOEL

Bepaal voor iedere machine:

1. De actuele marktprijs aan een eindgebruiker.
2. De verwachte daadwerkelijke verkoopprijs.
3. De aanbevolen handels- of inkoopprijs.
4. Het maximale bedrag dat wij veilig kunnen bieden.
5. Een logisch eerste openingsbod.
6. De verwachte bruto marge.
7. Bekende gebreken en waardeverminderingen.
8. Argumenten waarmee de medewerker een lager bod kan onderbouwen.
9. Vergelijkbare actuele advertenties waarop de schatting is gebaseerd.
10. Welke informatie nog ontbreekt om de taxatie betrouwbaarder te maken.

## BELANGRIJKE DEFINITIES

* Markt-vraagprijs: bedrag waarvoor vergelijkbare machines online worden aangeboden.
* Verwachte verkoopprijs: realistische prijs waarvoor de machine waarschijnlijk daadwerkelijk verkocht kan worden, meestal lager dan de online vraagprijs.
* Handelsprijs: bedrag dat een professionele handelaar ongeveer voor de machine kan betalen.
* Aanbevolen inkoopprijs: veilige prijs voor ons, rekening houdend met kosten, risico en gewenste marge.
* Maximumprijs: absoluut hoogste inkoopprijs waarbij de deal nog commercieel verantwoord is.
* Openingsbod: lager eerste bod waarmee onderhandelingsruimte overblijft.
* Brutomarge: verwachte verkoopprijs minus inkoopprijs. Vermeld daarnaast de marge na geschatte directe kosten.

Alle prijzen zijn standaard exclusief btw, tenzij expliciet anders aangegeven.

## VERPLICHT MARKTONDERZOEK

Voer bij iedere taxatie een actuele zoekopdracht op internet uit via web search.

Zoek eerst naar:

1. Exact hetzelfde merk en model.
2. Hetzelfde bouwjaar, plus of min twee jaar.
3. Een vergelijkbaar aantal draaiuren.
4. Dezelfde aandrijving: elektrisch, LPG, diesel of anders.
5. Dezelfde hefhoogte, mast, capaciteit en uitvoering.

Gebruik bij voorkeur advertenties uit Nederland, België en Duitsland. Breid pas daarna uit naar andere Europese landen.

Zoek onder andere op:

* Machineryline
* Forkliftonline
* Truck1
* Mascus
* Marktplaats
* Nederlandse en Europese heftruckdealers
* Veilingplatforms
* Andere betrouwbare marktplaatsen voor interntransportmaterieel

Gebruik bij voorkeur minimaal drie en maximaal zes goede vergelijkingen.

Gebruik nooit verzonnen advertenties, prijzen of links. Neem alleen links op die daadwerkelijk tijdens het actuele marktonderzoek zijn gevonden.

Wanneer er onvoldoende goede vergelijkingen zijn, meld dit duidelijk en verlaag de betrouwbaarheidsscore.

## BEOORDELING VAN VERGELIJKBARE ADVERTENTIES

Behandel een online vraagprijs nooit automatisch als de werkelijke marktwaarde.

Corrigeer advertenties waar nodig voor dealeropslag, garantie, rijklaar maken, transport, btw-status, bouwjaar, draaiuren, mast, hefhoogte, sideshift, cabine, banden, lader, accuconditie, onderhoudshistorie, technische gebreken, locatie en exportmarkt.

Een dealer-vraagprijs moet doorgaans hoger liggen dan de verwachte verkoopprijs en duidelijk hoger dan de handelsprijs.

## PRIJSBEREKENING

Bereken in deze volgorde: gemiddelde gecorrigeerde markt-vraagprijs → verwachte verkoopprijs → directe kosten + risicoreserve → gewenste handelsmarge → aanbevolen inkoopprijs → openingsbod → maximumprijs.

Aanbevolen inkoopprijs = verwachte verkoopprijs − verwachte directe kosten − risicoreserve − gewenste brutomarge

Laat de marge nooit alleen als percentage zien. Vermeld altijd het bedrag in euro’s.

Wanneer geen gewenste marge is opgegeven, gebruik:
* Verkoopprijs tot €4.000: richtmarge €750 tot €1.250
* €4.000 tot €8.000: €1.000 tot €1.750
* €8.000 tot €15.000: €1.500 tot €2.500
* Boven €15.000: ongeveer 12% tot 20%

Pas de marge omhoog aan bij oude machines, onduidelijke historie, technische risico’s of moeilijk verkoopbare uitvoeringen.

## ELEKTRISCHE / LPG / DIESEL

Controleer relevante risico’s (accu, koude start, lekkage, mast, banden, etc.). Bij onbekende accustaat: “Accustaat onbekend en daarom financieel risico.” Noem geen verzonnen gebreken.

## GEBREKEN

Maak onderscheid tussen bekende gebreken en onbekende risico’s. Noem een mogelijk probleem nooit als vastgesteld gebrek.

## ONDERHANDELINGSARGUMENTEN

Geef concrete, zakelijke redenen specifiek voor deze machine.

## BETROUWBAARHEID

Hoog / middel / laag + score 0–100.

## VERPLICHTE OUTPUT

Geef uitsluitend geldige JSON terug in onderstaande structuur (geen markdown, geen uitleg erbuiten):

{
"samenvatting": {
"machine": "",
"bouwjaar": null,
"draaiuren": null,
"aandrijving": "",
"taxatie_datum": "",
"valuta": "EUR",
"prijzen_exclusief_btw": true
},
"prijsadvies": {
"markt_vraagprijs_min": 0,
"markt_vraagprijs_max": 0,
"verwachte_verkoopprijs": 0,
"verwachte_verkoopprijs_min": 0,
"verwachte_verkoopprijs_max": 0,
"aanbevolen_inkoopprijs": 0,
"openingsbod": 0,
"maximum_inkoopprijs": 0,
"directe_kosten_reserve": 0,
"technische_risicoreserve": 0,
"verwachte_brutomarge": 0,
"verwachte_marge_na_directe_kosten": 0,
"brutomarge_percentage": 0
},
"korte_conclusie_voor_medewerker": "",
"bekende_gebreken": [],
"onbekende_risicos": [],
"redenen_voor_lager_bod": [],
"vergelijkbare_machines": [],
"waardebepalende_factoren": [],
"ontbrekende_informatie": [],
"betrouwbaarheid": {
"niveau": "hoog | middel | laag",
"score": 0,
"toelichting": ""
},
"waarschuwing": ""
}

## OUTPUTREGELS

* Geef uitsluitend JSON terug.
* Gebruik gehele eurobedragen.
* Gebruik null wanneer informatie onbekend is.
* Laat arrays leeg wanneer er geen gegevens zijn.
* Verzin nooit gebreken, urenstanden, prijzen of links.
* Het veld url in vergelijkbare_machines mag ALLEEN een volledige absolute URL zijn die begint met https:// of http:// (exacte advertentielink uit web search). Nooit zinnen, bronvermeldingen of domeinnamen zonder pad zoals "gevonden op werktuigen.nl". Geen echte link? Zet url op "".
* De aanbevolen inkoopprijs mag nooit hoger zijn dan de maximum inkoopprijs.
* Het openingsbod moet lager zijn dan de aanbevolen inkoopprijs.
* De verwachte verkoopprijs moet hoger zijn dan de aanbevolen inkoopprijs.
* Bij onvoldoende informatie: voorlopige taxatie met lagere betrouwbaarheid en concrete controlevragen.
* taxatie_datum = vandaag (Europe/Amsterdam) in YYYY-MM-DD.
`;

export type TaxatieInput = {
  merk: string;
  model: string;
  bouwjaar: string;
  draaiuren: string;
  aandrijving: string;
  capaciteitKg: string;
  hefhoogteMm: string;
  mast: string;
  uitvoering: string;
  banden: string;
  accuInfo: string;
  locatie: string;
  verkoperRichtprijs: string;
  bekendeGebreken: string;
  extraNotities: string;
  omschrijving: string;
  /** Optionele lead-foto (bijv. typeplaatje) */
  photoId?: string;
  photoUrl?: string;
};

export type TaxatieResult = {
  samenvatting: {
    machine: string;
    bouwjaar: number | null;
    draaiuren: number | null;
    aandrijving: string;
    taxatie_datum: string;
    valuta: string;
    prijzen_exclusief_btw: boolean;
  };
  prijsadvies: {
    markt_vraagprijs_min: number;
    markt_vraagprijs_max: number;
    verwachte_verkoopprijs: number;
    verwachte_verkoopprijs_min: number;
    verwachte_verkoopprijs_max: number;
    aanbevolen_inkoopprijs: number;
    openingsbod: number;
    maximum_inkoopprijs: number;
    directe_kosten_reserve: number;
    technische_risicoreserve: number;
    verwachte_brutomarge: number;
    verwachte_marge_na_directe_kosten: number;
    brutomarge_percentage: number;
  };
  korte_conclusie_voor_medewerker: string;
  bekende_gebreken: Array<{
    gebrek: string;
    ernst: string;
    geschatte_reparatiekosten_min: number;
    geschatte_reparatiekosten_max: number;
    waardevermindering: number;
    toelichting: string;
  }>;
  onbekende_risicos: Array<{
    onderdeel: string;
    waarom_belangrijk: string;
    mogelijke_financiele_impact_min: number;
    mogelijke_financiele_impact_max: number;
    controle_vraag: string;
  }>;
  redenen_voor_lager_bod: Array<{
    reden: string;
    bedrag_effect: number;
    zin_voor_tijdens_het_gesprek: string;
  }>;
  vergelijkbare_machines: Array<{
    titel: string;
    merk: string;
    model: string;
    bouwjaar: number | null;
    draaiuren: number | null;
    vraagprijs: number | null;
    valuta: string;
    land: string;
    verkoper_type: string;
    url: string;
    overeenkomsten: string;
    verschillen: string;
    geschatte_gecorrigeerde_waarde: number;
    relevantie_score: number;
  }>;
  waardebepalende_factoren: Array<{
    factor: string;
    effect: string;
    geschatte_prijsimpact: number;
    toelichting: string;
  }>;
  ontbrekende_informatie: Array<{
    vraag: string;
    waarom_nodig: string;
    prioriteit: string;
  }>;
  betrouwbaarheid: {
    niveau: string;
    score: number;
    toelichting: string;
  };
  waarschuwing: string;
};

export function buildTaxatieUserPrompt(input: TaxatieInput): string {
  const lines = [
    "Taxeer de volgende gebruikte heftruck voor handelsinkoop (Nederland).",
    "",
    `Merk: ${input.merk || "onbekend"}`,
    `Model: ${input.model || "onbekend"}`,
    `Bouwjaar: ${input.bouwjaar || "onbekend"}`,
    `Draaiuren: ${input.draaiuren || "onbekend"}`,
    `Aandrijving: ${input.aandrijving || "onbekend"}`,
    `Capaciteit (kg): ${input.capaciteitKg || "onbekend"}`,
    `Hefhoogte (mm): ${input.hefhoogteMm || "onbekend"}`,
    `Mast: ${input.mast || "onbekend"}`,
    `Uitvoering / opties: ${input.uitvoering || "onbekend"}`,
    `Banden: ${input.banden || "onbekend"}`,
    `Accu / lader: ${input.accuInfo || "onbekend"}`,
    `Locatie verkoper: ${input.locatie || "onbekend"}`,
    `Richtprijs verkoper (€ excl. btw): ${input.verkoperRichtprijs || "onbekend"}`,
    `Bekende gebreken (door verkoper / foto's): ${input.bekendeGebreken || "geen genoemd"}`,
    `Omschrijving lead: ${input.omschrijving || "—"}`,
    `Extra notities medewerker: ${input.extraNotities || "—"}`,
    input.photoUrl
      ? "Er is een foto bijgevoegd (bijv. typeplaatje/serienummer). Lees zichtbare gegevens (merk, model, bouwjaar, capaciteit, serienummer) en gebruik die in de taxatie."
      : "",
    "",
    "Zoek actuele vergelijkbare advertenties (Machineryline, Forkliftonline, Truck1, Mascus, Marktplaats, dealers NL/BE/DE).",
    "Zet per vergelijking de exacte https:// advertentie-URL in het veld url (nooit een zin of alleen een domeinnaam).",
    "Geef uitsluitend de verplichte JSON terug.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Strict schema: web_search + json_object mag niet, json_schema wel. */
const TAXATIE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "samenvatting",
    "prijsadvies",
    "korte_conclusie_voor_medewerker",
    "bekende_gebreken",
    "onbekende_risicos",
    "redenen_voor_lager_bod",
    "vergelijkbare_machines",
    "waardebepalende_factoren",
    "ontbrekende_informatie",
    "betrouwbaarheid",
    "waarschuwing",
  ],
  properties: {
    samenvatting: {
      type: "object",
      additionalProperties: false,
      required: [
        "machine",
        "bouwjaar",
        "draaiuren",
        "aandrijving",
        "taxatie_datum",
        "valuta",
        "prijzen_exclusief_btw",
      ],
      properties: {
        machine: { type: "string" },
        bouwjaar: { type: ["integer", "null"] },
        draaiuren: { type: ["integer", "null"] },
        aandrijving: { type: "string" },
        taxatie_datum: { type: "string" },
        valuta: { type: "string" },
        prijzen_exclusief_btw: { type: "boolean" },
      },
    },
    prijsadvies: {
      type: "object",
      additionalProperties: false,
      required: [
        "markt_vraagprijs_min",
        "markt_vraagprijs_max",
        "verwachte_verkoopprijs",
        "verwachte_verkoopprijs_min",
        "verwachte_verkoopprijs_max",
        "aanbevolen_inkoopprijs",
        "openingsbod",
        "maximum_inkoopprijs",
        "directe_kosten_reserve",
        "technische_risicoreserve",
        "verwachte_brutomarge",
        "verwachte_marge_na_directe_kosten",
        "brutomarge_percentage",
      ],
      properties: {
        markt_vraagprijs_min: { type: "integer" },
        markt_vraagprijs_max: { type: "integer" },
        verwachte_verkoopprijs: { type: "integer" },
        verwachte_verkoopprijs_min: { type: "integer" },
        verwachte_verkoopprijs_max: { type: "integer" },
        aanbevolen_inkoopprijs: { type: "integer" },
        openingsbod: { type: "integer" },
        maximum_inkoopprijs: { type: "integer" },
        directe_kosten_reserve: { type: "integer" },
        technische_risicoreserve: { type: "integer" },
        verwachte_brutomarge: { type: "integer" },
        verwachte_marge_na_directe_kosten: { type: "integer" },
        brutomarge_percentage: { type: "number" },
      },
    },
    korte_conclusie_voor_medewerker: { type: "string" },
    bekende_gebreken: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "gebrek",
          "ernst",
          "geschatte_reparatiekosten_min",
          "geschatte_reparatiekosten_max",
          "waardevermindering",
          "toelichting",
        ],
        properties: {
          gebrek: { type: "string" },
          ernst: { type: "string" },
          geschatte_reparatiekosten_min: { type: "integer" },
          geschatte_reparatiekosten_max: { type: "integer" },
          waardevermindering: { type: "integer" },
          toelichting: { type: "string" },
        },
      },
    },
    onbekende_risicos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "onderdeel",
          "waarom_belangrijk",
          "mogelijke_financiele_impact_min",
          "mogelijke_financiele_impact_max",
          "controle_vraag",
        ],
        properties: {
          onderdeel: { type: "string" },
          waarom_belangrijk: { type: "string" },
          mogelijke_financiele_impact_min: { type: "integer" },
          mogelijke_financiele_impact_max: { type: "integer" },
          controle_vraag: { type: "string" },
        },
      },
    },
    redenen_voor_lager_bod: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["reden", "bedrag_effect", "zin_voor_tijdens_het_gesprek"],
        properties: {
          reden: { type: "string" },
          bedrag_effect: { type: "integer" },
          zin_voor_tijdens_het_gesprek: { type: "string" },
        },
      },
    },
    vergelijkbare_machines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "titel",
          "merk",
          "model",
          "bouwjaar",
          "draaiuren",
          "vraagprijs",
          "valuta",
          "land",
          "verkoper_type",
          "url",
          "overeenkomsten",
          "verschillen",
          "geschatte_gecorrigeerde_waarde",
          "relevantie_score",
        ],
        properties: {
          titel: { type: "string" },
          merk: { type: "string" },
          model: { type: "string" },
          bouwjaar: { type: ["integer", "null"] },
          draaiuren: { type: ["integer", "null"] },
          vraagprijs: { type: ["integer", "null"] },
          valuta: { type: "string" },
          land: { type: "string" },
          verkoper_type: { type: "string" },
          url: { type: "string" },
          overeenkomsten: { type: "string" },
          verschillen: { type: "string" },
          geschatte_gecorrigeerde_waarde: { type: "integer" },
          relevantie_score: { type: "integer" },
        },
      },
    },
    waardebepalende_factoren: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["factor", "effect", "geschatte_prijsimpact", "toelichting"],
        properties: {
          factor: { type: "string" },
          effect: { type: "string" },
          geschatte_prijsimpact: { type: "integer" },
          toelichting: { type: "string" },
        },
      },
    },
    ontbrekende_informatie: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["vraag", "waarom_nodig", "prioriteit"],
        properties: {
          vraag: { type: "string" },
          waarom_nodig: { type: "string" },
          prioriteit: { type: "string" },
        },
      },
    },
    betrouwbaarheid: {
      type: "object",
      additionalProperties: false,
      required: ["niveau", "score", "toelichting"],
      properties: {
        niveau: { type: "string" },
        score: { type: "integer" },
        toelichting: { type: "string" },
      },
    },
    waarschuwing: { type: "string" },
  },
} as const;

function repairJsonText(text: string): string {
  let t = text.trim();
  // Strip citation/annotation junk sometimes appended by web_search
  t = t.replace(/\u3010[^\u3011]*\u3011/g, "");
  // Trailing commas before } or ]
  t = t.replace(/,\s*([}\]])/g, "$1");
  // Smart quotes → regular
  t = t.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  return t;
}

function extractJsonObject(text: string): unknown {
  const candidates: string[] = [];
  const trimmed = repairJsonText(text);
  candidates.push(trimmed);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(repairJsonText(fenced[1]));

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    candidates.push(repairJsonText(trimmed.slice(start, end + 1)));
  }

  let lastErr: Error | null = null;
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr || new Error("Geen JSON in modelantwoord");
}

type UrlCitation = { title: string; url: string };

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        title?: string;
        url?: string;
      }>;
    }>;
  }>;
  error?: { message?: string };
};

/** Alleen echte absolute http(s)-links; anders null. */
export function normalizeListingUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s || s === "-----") return null;

  // Haal eerste http(s) URL uit tekst
  const embedded = s.match(/https?:\/\/[^\s"'<>\]\)]+/i);
  if (embedded) {
    s = embedded[0].replace(/[.,;:]+$/, "");
  } else {
    // Alleen kale domeinen / paden accepteren als er geen spatien/zinnen in zitten
    if (/\s/.test(s) || /gevonden|via|bron|advertentie/i.test(s)) {
      return null;
    }
    if (/^(www\.)?[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(s)) {
      s = `https://${s.replace(/^\/\//, "")}`;
    } else {
      return null;
    }
  }

  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Strip openai tracking
    u.searchParams.delete("utm_source");
    return u.toString();
  } catch {
    return null;
  }
}

function citationsFromResponses(data: ResponsesApiResult): UrlCitation[] {
  const out: UrlCitation[] = [];
  const seen = new Set<string>();
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      for (const a of c.annotations ?? []) {
        if (a.type !== "url_citation") continue;
        const url = normalizeListingUrl(a.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push({ title: (a.title || "").trim(), url });
      }
    }
  }
  return out;
}

function attachCitationUrls(
  result: TaxatieResult,
  citations: UrlCitation[],
): TaxatieResult {
  const machines = Array.isArray(result.vergelijkbare_machines)
    ? [...result.vergelijkbare_machines]
    : [];

  const used = new Set<string>();
  for (let i = 0; i < machines.length; i++) {
    const normalized = normalizeListingUrl(machines[i].url);
    if (normalized) {
      machines[i] = { ...machines[i], url: normalized };
      used.add(normalized);
      continue;
    }

    // Match citation by overlapping title words, else next unused citation
    const title = `${machines[i].titel} ${machines[i].merk} ${machines[i].model}`.toLowerCase();
    const match =
      citations.find(
        (c) =>
          !used.has(c.url) &&
          c.title &&
          title &&
          c.title
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 3)
            .some((w) => title.includes(w)),
      ) || citations.find((c) => !used.has(c.url));

    machines[i] = {
      ...machines[i],
      url: match?.url || "",
      titel: machines[i].titel || match?.title || machines[i].titel,
    };
    if (match) used.add(match.url);
  }

  // Voeg overgebleven echte zoekresultaten toe als er te weinig links zijn
  for (const c of citations) {
    if (used.has(c.url)) continue;
    if (machines.length >= 6) break;
    machines.push({
      titel: c.title || c.url,
      merk: "",
      model: "",
      bouwjaar: null,
      draaiuren: null,
      vraagprijs: null,
      valuta: "EUR",
      land: "",
      verkoper_type: "onbekend",
      url: c.url,
      overeenkomsten: "",
      verschillen: "",
      geschatte_gecorrigeerde_waarde: 0,
      relevantie_score: 50,
    });
    used.add(c.url);
  }

  return { ...result, vergelijkbare_machines: machines };
}

function urlsFromText(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s"'<>\]\)]+/gi) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const url = normalizeListingUrl(raw);
    if (!url || seen.has(url)) continue;
    // Skip generic/non-listing noise
    if (/openai\.com|wikipedia\.|google\.com\/search/i.test(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function mergeCitations(
  citations: UrlCitation[],
  text: string,
): UrlCitation[] {
  const out = [...citations];
  const seen = new Set(citations.map((c) => c.url));
  for (const url of urlsFromText(text)) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: "", url });
  }
  return out;
}

function textFromResponses(data: ResponsesApiResult): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (
        (c.type === "output_text" || c.type === "text") &&
        typeof c.text === "string" &&
        c.text
      ) {
        parts.push(c.text);
      }
    }
  }
  return parts.join("\n").trim();
}

async function researchMarket(
  apiKey: string,
  model: string,
  input: TaxatieInput,
): Promise<{ researchText: string; citations: UrlCitation[] }> {
  const imageUrl = input.photoUrl?.trim() || "";
  const researchPrompt = [
    "Doe actueel marktonderzoek voor handelsinkoop van deze gebruikte heftruck.",
    buildTaxatieUserPrompt(input),
    "",
    "Zoek op Machineryline, Forkliftonline, Truck1, Mascus, Marktplaats en dealers (NL/BE/DE).",
    "Geef 3 tot 6 concrete advertenties terug.",
    "Voor ELKE advertentie: titel, merk, model, bouwjaar, draaiuren, vraagprijs, land, verkoper-type, en de VOLLEDIGE https:// advertentie-URL.",
    "Zonder echte URL mag je die advertentie niet noemen.",
  ].join("\n");

  const inputPayload = imageUrl
    ? [
        {
          role: "user",
          content: [
            { type: "input_text", text: researchPrompt },
            { type: "input_image", image_url: imageUrl, detail: "high" },
          ],
        },
      ]
    : researchPrompt;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      temperature: 0.2,
      max_output_tokens: 4000,
      instructions:
        "Je bent een marktonderzoeker voor gebruikte heftrucks. Lever alleen echte gevonden advertenties met klikbare https-links.",
      input: inputPayload,
    }),
  });

  const data = (await res.json()) as ResponsesApiResult;
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI researchfout (${res.status})`);
  }

  const researchText = textFromResponses(data);
  if (!researchText) {
    throw new Error("Leeg marktonderzoek van OpenAI");
  }

  const citations = mergeCitations(
    citationsFromResponses(data),
    researchText,
  );
  return { researchText, citations };
}

async function formatTaxatieJson(
  apiKey: string,
  model: string,
  rawText: string,
  input: TaxatieInput,
  citations: UrlCitation[],
): Promise<TaxatieResult> {
  const citationBlock =
    citations.length > 0
      ? [
          "",
          "Gevonden advertentielinks — zet deze EXACT in vergelijkbare_machines[].url:",
          ...citations.map(
            (c, i) => `${i + 1}. ${c.title || "Advertentie"} → ${c.url}`,
          ),
          "Elke vergelijkbare_machine moet een van deze urls krijgen wanneer mogelijk. Verzin geen urls.",
        ].join("\n")
      : "";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      instructions: TAXATIE_SYSTEM_PROMPT,
      input: [
        "Machine:",
        buildTaxatieUserPrompt(input),
        "",
        "Ruwe marktonderzoeksoutput:",
        rawText.slice(0, 50000),
        citationBlock,
        "",
        "Maak de taxatie-JSON. url-velden moeten echte https:// links zijn uit de lijst hierboven.",
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "heftruck_taxatie",
          strict: true,
          schema: TAXATIE_JSON_SCHEMA,
        },
      },
    }),
  });

  const data = (await res.json()) as ResponsesApiResult;
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI formatfout (${res.status})`);
  }
  const text = textFromResponses(data);
  if (!text) throw new Error("Leeg format-antwoord van OpenAI");
  return extractJsonObject(text) as TaxatieResult;
}

export async function runTaxatieWithOpenAI(
  input: TaxatieInput,
): Promise<TaxatieResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY ontbreekt. Zet de key in Vercel env / .env.local.",
    );
  }

  const model = process.env.OPENAI_TAXATIE_MODEL?.trim() || "gpt-4.1";

  // 1) Vrije web search → echte advertentielinks/citations
  const { researchText, citations } = await researchMarket(
    apiKey,
    model,
    input,
  );

  // 2) Structured taxatie-JSON met die links
  let parsed: TaxatieResult;
  try {
    parsed = await formatTaxatieJson(
      apiKey,
      model,
      researchText,
      input,
      citations,
    );
  } catch {
    throw new Error("Taxatie-antwoord was ongeldig. Probeer opnieuw.");
  }

  if (!parsed?.prijsadvies || !parsed?.samenvatting) {
    throw new Error("Ongeldige taxatie-JSON van het model");
  }

  return attachCitationUrls(parsed, citations);
}
