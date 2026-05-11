import { NextResponse } from "next/server";
import { isAdminTokenUser } from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";
import { getPasskeySession } from "@/lib/passkey-session";
import { runStreamCommand } from "@/lib/raspberry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = getBearerToken(authHeader);
  const user = await verifyFirebaseToken(authHeader);
  const passkeySession = await getPasskeySession();

  if ((!token || !(await isAdminTokenUser(token, user))) && passkeySession?.role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden parar la transmision." }, { status: 403 });
  }

  try {
    const result = await runStreamCommand("stop");

    return NextResponse.json({
      status: result.ok ? "stopped" : "failed",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido."
      },
      { status: 500 }
    );
  }
}
