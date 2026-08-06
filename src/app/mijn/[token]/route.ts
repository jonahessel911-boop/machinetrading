import { NextResponse } from "next/server";
import {
  attachPortalSession,
  verifyPortalToken,
} from "@/lib/portal-auth";

type Params = { params: Promise<{ token: string }> };

/** Magic-link landing: set session cookie and redirect to dashboard. */
export async function GET(request: Request, { params }: Params) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const session = await verifyPortalToken(token);

  if (!session) {
    return NextResponse.redirect(new URL("/mijn?error=ongeldig", request.url));
  }

  const response = NextResponse.redirect(
    new URL("/mijn/dashboard", request.url),
  );
  await attachPortalSession(response, session);
  return response;
}
