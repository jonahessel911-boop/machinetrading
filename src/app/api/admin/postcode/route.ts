import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const postcode = (searchParams.get("postcode") ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const number = (searchParams.get("number") ?? "").trim();

  if (!postcode || !number) {
    return NextResponse.json(
      { error: "Postcode en huisnummer zijn verplicht" },
      { status: 400 },
    );
  }

  const apiKey = process.env.POSTCODE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "POSTCODE_API_KEY ontbreekt in .env" },
      { status: 500 },
    );
  }

  const url = `https://json.api-postcode.nl?postcode=${encodeURIComponent(postcode)}&number=${encodeURIComponent(number)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        token: apiKey,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          error:
            res.status === 404
              ? "Adres niet gevonden"
              : `Postcode API fout (${res.status}): ${text.slice(0, 120)}`,
        },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({
      street: data.street ?? "",
      city: data.city ?? "",
      house_number: String(data.house_number ?? number),
      zip_code: data.zip_code ?? data.postcode ?? postcode,
      province: data.province ?? "",
      longitude: data.longitude ?? null,
      latitude: data.latitude ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kon postcode niet ophalen" },
      { status: 502 },
    );
  }
}
