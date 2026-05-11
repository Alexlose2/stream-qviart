import { NextResponse } from "next/server";
import { isAllowedTokenUser } from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";
import { runStreamCommand } from "@/lib/raspberry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = getBearerToken(authHeader);
  const user = await verifyFirebaseToken(authHeader);

  if (!token || !(await isAllowedTokenUser(token, user))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const result = await runStreamCommand();

    return NextResponse.json({
      status: result.ok ? "started" : "failed",
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
