import { NextResponse } from "next/server";
import {
  deleteAllowedEmail,
  isAdminTokenUser,
  listAllowedEmails,
  saveAllowedEmail
} from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";
import { listPasskeys } from "@/lib/passkeys";

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

  try {
    const [emails, passkeys] = await Promise.all([
      listAllowedEmails(token),
      listPasskeys(token).catch(() => [])
    ]);
    const passkeysByEmail = new Map<string, number>();
    passkeys.forEach((passkey) => {
      passkeysByEmail.set(passkey.email, (passkeysByEmail.get(passkey.email) ?? 0) + 1);
    });

    return NextResponse.json({
      emails: emails.map((record) => ({
        ...record,
        passkeyCount: passkeysByEmail.get(record.email) ?? 0
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la lista." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const token = await requireAdmin(request);
  if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: string; role?: "admin" | "user" };
    const email = body.email?.trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "user";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email no valido." }, { status: 400 });
    }

    await saveAllowedEmail(token, email, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const token = await requireAdmin(request);
  if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email no valido." }, { status: 400 });
    }

    await deleteAllowedEmail(token, email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar." },
      { status: 500 }
    );
  }
}
