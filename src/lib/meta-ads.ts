/**
 * Meta Marketing API — ad spend ophalen.
 * Env: META_ACCESS_TOKEN (of fallback META_CAPI_ACCESS_TOKEN).
 * Optioneel: META_AD_ACCOUNT_ID (act_123… of 123…) als er meerdere accounts zijn.
 */

const META_API_VERSION = "v19.0";

export type MetaAdAccount = {
  id: string; // act_…
  accountId: string;
  name: string;
  currency: string | null;
};

export type MetaDailySpend = {
  date: string; // YYYY-MM-DD
  spend: number;
  accountId: string;
  accountName: string;
};

function metaAccessToken(): string | null {
  return (
    process.env.META_ACCESS_TOKEN?.trim() ||
    process.env.META_CAPI_ACCESS_TOKEN?.trim() ||
    null
  );
}

function normalizeActId(raw: string): string {
  const id = raw.trim();
  if (!id) return id;
  return id.startsWith("act_") ? id : `act_${id}`;
}

async function metaGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = metaAccessToken();
  if (!token) {
    throw new Error(
      "Geen Meta access token. Zet META_ACCESS_TOKEN (of META_CAPI_ACCESS_TOKEN) in de omgeving.",
    );
  }
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = (await res.json()) as T & {
    error?: { message?: string; code?: number; error_user_msg?: string };
  };
  if (!res.ok || body.error) {
    const msg =
      body.error?.error_user_msg ||
      body.error?.message ||
      `Meta Ads API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export function hasMetaAccessToken(): boolean {
  return Boolean(metaAccessToken());
}

/** Alle ad accounts zichtbaar voor deze token. */
export async function listMetaAdAccounts(): Promise<MetaAdAccount[]> {
  const body = await metaGet<{
    data?: {
      id: string;
      account_id: string;
      name: string;
      currency?: string;
    }[];
  }>("/me/adaccounts", {
    fields: "id,account_id,name,currency",
    limit: "100",
  });

  return (body.data ?? []).map((a) => ({
    id: a.id,
    accountId: a.account_id,
    name: a.name,
    currency: a.currency ?? null,
  }));
}

/**
 * Bepaal welke account(s) te syncen.
 * - META_AD_ACCOUNT_ID gezet → alleen die
 * - anders alle accounts van de token
 */
export async function resolveMetaAdAccounts(): Promise<MetaAdAccount[]> {
  const configured = process.env.META_AD_ACCOUNT_ID?.trim();
  const all = await listMetaAdAccounts();
  if (configured) {
    const want = normalizeActId(configured);
    const match = all.find(
      (a) => a.id === want || `act_${a.accountId}` === want,
    );
    if (match) return [match];
    // Account niet in /me/adaccounts maar ID wel gezet — probeer toch
    return [
      {
        id: want,
        accountId: want.replace(/^act_/, ""),
        name: want,
        currency: null,
      },
    ];
  }
  if (all.length === 0) {
    throw new Error(
      "Geen ad accounts gevonden voor deze token. Gebruik een token met ads_read en toegang tot je ad account.",
    );
  }
  return all;
}

type InsightsRow = {
  spend?: string;
  date_start?: string;
  date_stop?: string;
};

async function fetchAccountDailySpend(
  account: MetaAdAccount,
  since: string,
  until: string,
): Promise<MetaDailySpend[]> {
  const out: MetaDailySpend[] = [];
  let after: string | undefined;

  do {
    const params: Record<string, string> = {
      fields: "spend,date_start,date_stop",
      level: "account",
      time_increment: "1",
      time_range: JSON.stringify({ since, until }),
      limit: "500",
    };
    if (after) params.after = after;

    const body = await metaGet<{
      data?: InsightsRow[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`/${account.id}/insights`, params);

    for (const row of body.data ?? []) {
      const date = (row.date_start || "").slice(0, 10);
      const spend = Number(row.spend) || 0;
      if (!date) continue;
      out.push({
        date,
        spend,
        accountId: account.id,
        accountName: account.name,
      });
    }

    after = body.paging?.next ? body.paging.cursors?.after : undefined;
  } while (after);

  return out;
}

function defaultSinceUntil(daysBack: number): { since: string; until: string } {
  const untilDate = new Date();
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - Math.max(1, daysBack));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { since: iso(sinceDate), until: iso(untilDate) };
}

/**
 * Haalt dagelijkse ad spend op (som over alle gekozen accounts).
 */
export async function fetchMetaDailyAdSpend(opts?: {
  daysBack?: number;
  since?: string;
  until?: string;
}): Promise<{
  accounts: MetaAdAccount[];
  days: { date: string; spend: number }[];
  currency: string | null;
}> {
  const range =
    opts?.since && opts?.until
      ? { since: opts.since.slice(0, 10), until: opts.until.slice(0, 10) }
      : defaultSinceUntil(opts?.daysBack ?? 30);

  const accounts = await resolveMetaAdAccounts();
  const byDate = new Map<string, number>();

  for (const account of accounts) {
    const rows = await fetchAccountDailySpend(
      account,
      range.since,
      range.until,
    );
    for (const row of rows) {
      byDate.set(row.date, (byDate.get(row.date) || 0) + row.spend);
    }
  }

  const days = [...byDate.entries()]
    .map(([date, spend]) => ({ date, spend }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const currency =
    accounts.find((a) => a.currency)?.currency ??
    accounts[0]?.currency ??
    null;

  return { accounts, days, currency };
}
