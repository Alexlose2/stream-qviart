import { NextResponse } from "next/server";
import { clearPasskeySession } from "@/lib/passkey-session";

export async function DELETE() {
  await clearPasskeySession();
  return NextResponse.json({ ok: true });
}
