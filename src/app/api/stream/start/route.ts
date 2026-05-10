import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isEmailAllowed } from "@/lib/config";
import { runStreamCommand } from "@/lib/raspberry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!isEmailAllowed(session?.user.email)) {
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
