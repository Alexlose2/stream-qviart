import { NextResponse } from "next/server";
import {
  deleteAllowedEmail,
  isAdminTokenUser,
  listAllowedEmails,
  saveAllowedEmail
} from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = getBearerToken(authHeader);
  const user = await verifyFirebaseToken(authHeader);

  if (!token || !(await isAdminTokenUser(token, user))) {
    return null;
  }

  return token;
}

export async function GET(request: Request) {
  const token = await requireAdmin(request);
  if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  return NextResponse.json({ emails: await listAllowedEmails(token) });
}

export async function POST(request: Request) {
  const token = await requireAdmin(request);
  if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const body = (await request.json()) as { email?: string; role?: "admin" | "user" };
  const email = body.email?.trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "user";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email no valido." }, { status: 400 });
  }

  await saveAllowedEmail(token, email, role);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const token = await requireAdmin(request);
  if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email no valido." }, { status: 400 });
  }

  await deleteAllowedEmail(token, email);
  return NextResponse.json({ ok: true });
}
