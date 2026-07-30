import { createHash } from "crypto";
import { headers } from "next/headers";

const META_API_VERSION = "v19.0";

export type MetaUserHints = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  country?: string | null;
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

export type MetaCustomData = {
  currency?: string;
  value?: number;
  contentIds?: string[];
  contentType?: string;
  contentName?: string;
  leadSource?: string;
};

export type MetaEventInput = {
  eventName: "Lead" | "Deal";
  eventId: string;
  eventSourceUrl?: string;
  eventTime?: number;
  user: MetaUserHints;
  customData?: MetaCustomData;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Meta: cijfers only, inclusief landcode zonder + */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits;
}

function hashIfPresent(raw: string | null | undefined, normalize?: (v: string) => string): string[] | undefined {
  if (!raw) return undefined;
  const cleaned = (normalize ? normalize(raw) : raw.trim().toLowerCase());
  if (!cleaned) return undefined;
  return [sha256(cleaned)];
}

function splitName(fullName: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  if (!fullName?.trim()) return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function buildMetaUserData(user: MetaUserHints): Record<string, unknown> {
  const fromSplit = splitName(
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || null,
  );
  const firstName = user.firstName || fromSplit.firstName;
  const lastName = user.lastName || fromSplit.lastName;

  const data: Record<string, unknown> = {};
  const em = hashIfPresent(user.email, normalizeEmail);
  const ph = hashIfPresent(user.phone, normalizePhone);
  const fn = hashIfPresent(firstName);
  const ln = hashIfPresent(lastName);
  const ct = hashIfPresent(user.city);
  const country = hashIfPresent(user.country || "nl");
  const externalId = hashIfPresent(user.externalId, (v) => v.trim());

  if (em) data.em = em;
  if (ph) data.ph = ph;
  if (fn) data.fn = fn;
  if (ln) data.ln = ln;
  if (ct) data.ct = ct;
  if (country) data.country = country;
  if (externalId) data.external_id = externalId;
  if (user.fbp?.trim()) data.fbp = user.fbp.trim();
  if (user.fbc?.trim()) data.fbc = user.fbc.trim();
  if (user.clientIpAddress?.trim()) {
    data.client_ip_address = user.clientIpAddress.trim();
  }
  if (user.clientUserAgent?.trim()) {
    data.client_user_agent = user.clientUserAgent.trim();
  }
  return data;
}

export type MetaSendResult = {
  ok: boolean;
  skipped?: boolean;
  eventsReceived?: number;
  error?: string;
};

/**
 * Stuurt een event naar de Meta Conversions API.
 * Zonder META_PIXEL_ID / META_CAPI_ACCESS_TOKEN: no-op (skipped).
 */
export async function sendMetaConversionEvent(
  input: MetaEventInput,
): Promise<MetaSendResult> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();

  if (!pixelId || !accessToken) {
    console.info("[meta-capi:skip]", {
      eventName: input.eventName,
      reason: "META_PIXEL_ID of META_CAPI_ACCESS_TOKEN ontbreekt",
    });
    return { ok: true, skipped: true };
  }

  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: eventTime,
        event_id: input.eventId,
        action_source: "website",
        ...(input.eventSourceUrl
          ? { event_source_url: input.eventSourceUrl }
          : {}),
        user_data: buildMetaUserData(input.user),
        ...(input.customData
          ? {
              custom_data: {
                ...(input.customData.currency
                  ? { currency: input.customData.currency }
                  : {}),
                ...(input.customData.value != null
                  ? { value: input.customData.value }
                  : {}),
                ...(input.customData.contentIds
                  ? { content_ids: input.customData.contentIds }
                  : {}),
                ...(input.customData.contentType
                  ? { content_type: input.customData.contentType }
                  : {}),
                ...(input.customData.contentName
                  ? { content_name: input.customData.contentName }
                  : {}),
                ...(input.customData.leadSource
                  ? { lead_source: input.customData.leadSource }
                  : {}),
              },
            }
          : {}),
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE?.trim()
      ? { test_event_code: process.env.META_TEST_EVENT_CODE.trim() }
      : {}),
  };

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };
    if (!res.ok) {
      const message = body.error?.message || `Meta CAPI HTTP ${res.status}`;
      console.error("[meta-capi:error]", input.eventName, message);
      return { ok: false, error: message };
    }
    console.info("[meta-capi:ok]", {
      eventName: input.eventName,
      eventId: input.eventId,
      eventsReceived: body.events_received,
    });
    return { ok: true, eventsReceived: body.events_received };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Meta CAPI mislukt";
    console.error("[meta-capi:error]", input.eventName, message);
    return { ok: false, error: message };
  }
}

export async function clientContextFromRequest(request?: Request): Promise<{
  clientIpAddress: string | null;
  clientUserAgent: string | null;
}> {
  try {
    const h = request ? request.headers : await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      h.get("cf-connecting-ip") ||
      null;
    return {
      clientIpAddress: ip,
      clientUserAgent: h.get("user-agent"),
    };
  } catch {
    return { clientIpAddress: null, clientUserAgent: null };
  }
}

export function readMetaCookiesFromHeader(
  cookieHeader: string | null,
): { fbp: string | null; fbc: string | null } {
  if (!cookieHeader) return { fbp: null, fbc: null };
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const get = (name: string) => {
    const row = parts.find((p) => p.startsWith(`${name}=`));
    return row ? decodeURIComponent(row.slice(name.length + 1)) : null;
  };
  return { fbp: get("_fbp"), fbc: get("_fbc") };
}

export function sendMetaLeadEvent(opts: {
  leadId: string;
  email: string;
  phone: string;
  naam: string;
  woonplaats?: string | null;
  merk?: string | null;
  model?: string | null;
  eventSourceUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}): Promise<MetaSendResult> {
  const machine = [opts.merk, opts.model].filter(Boolean).join(" ").trim();
  return sendMetaConversionEvent({
    eventName: "Lead",
    eventId: `lead-${opts.leadId}`,
    eventSourceUrl:
      opts.eventSourceUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.heftruckverkocht.nl/form",
    user: {
      email: opts.email,
      phone: opts.phone,
      firstName: opts.naam,
      city: opts.woonplaats,
      country: "nl",
      externalId: opts.leadId,
      fbp: opts.fbp,
      fbc: opts.fbc,
      clientIpAddress: opts.clientIpAddress,
      clientUserAgent: opts.clientUserAgent,
    },
    customData: {
      currency: "EUR",
      value: 0,
      contentType: "product",
      contentIds: machine ? [machine.toLowerCase().replace(/\s+/g, "-")] : ["heftruck"],
      contentName: machine || "heftruck",
      leadSource: "form-funnel",
    },
  });
}

export function sendMetaDealEvent(opts: {
  leadId: string;
  contractId: string;
  email: string;
  phone: string;
  naam: string;
  woonplaats?: string | null;
  merk?: string | null;
  model?: string | null;
  value?: number | null;
  eventSourceUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}): Promise<MetaSendResult> {
  const machine = [opts.merk, opts.model].filter(Boolean).join(" ").trim();
  const value = Number(opts.value) || 0;
  return sendMetaConversionEvent({
    eventName: "Deal",
    eventId: `deal-${opts.contractId}`,
    eventSourceUrl:
      opts.eventSourceUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.heftruckverkocht.nl"}/admin/leads/${opts.leadId}/deal`,
    user: {
      email: opts.email,
      phone: opts.phone,
      firstName: opts.naam,
      city: opts.woonplaats,
      country: "nl",
      externalId: opts.leadId,
      fbp: opts.fbp,
      fbc: opts.fbc,
      clientIpAddress: opts.clientIpAddress,
      clientUserAgent: opts.clientUserAgent,
    },
    customData: {
      currency: "EUR",
      value,
      contentType: "product",
      contentIds: machine ? [machine.toLowerCase().replace(/\s+/g, "-")] : ["heftruck"],
      contentName: machine || "heftruck",
      leadSource: "koopcontract",
    },
  });
}
