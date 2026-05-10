import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-token";
import { runStreamCommand } from "@/lib/raspberry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request.headers.get("authorization"));

  if (!user) {
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
