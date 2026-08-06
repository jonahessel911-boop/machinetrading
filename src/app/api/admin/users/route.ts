import { NextResponse } from "next/server";
import {
  ADMIN_LOGIN_DOMAIN,
  crmCreateAdminUser,
  crmListAdminUsers,
  generateAdminPassword,
  isHeftruckLoginEmail,
} from "@/lib/admin-users";
import { isAuthenticated } from "@/lib/auth";
import { adminUserInviteEmail, sendEmail } from "@/lib/email";
import { portalSiteUrl } from "@/lib/portal-auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await crmListAdminUsers();
    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const naam = typeof body.naam === "string" ? body.naam.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const privateEmail =
      typeof body.privateEmail === "string"
        ? body.privateEmail.trim().toLowerCase()
        : "";

    if (!naam) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }
    if (!isHeftruckLoginEmail(email)) {
      return NextResponse.json(
        {
          error: `Login e-mail moet eindigen op @${ADMIN_LOGIN_DOMAIN}`,
        },
        { status: 400 },
      );
    }
    if (!privateEmail.includes("@")) {
      return NextResponse.json(
        { error: "Vul een geldig privé e-mailadres in" },
        { status: 400 },
      );
    }

    const password = generateAdminPassword();
    const user = await crmCreateAdminUser({
      naam,
      email,
      privateEmail,
      password,
    });

    const loginUrl = `${portalSiteUrl()}/admin/login`;
    const mail = adminUserInviteEmail({
      toName: naam,
      email,
      password,
      loginUrl,
    });

    const sent = await sendEmail({
      to: privateEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      return NextResponse.json(
        {
          ok: true,
          user,
          mailSent: false,
          warning:
            sent.error ||
            "User aangemaakt, maar de e-mail met wachtwoord is niet verstuurd.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json({
      ok: true,
      user,
      mailSent: true,
      to: privateEmail,
      loginEmail: email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Aanmaken mislukt" },
      { status: 400 },
    );
  }
}
