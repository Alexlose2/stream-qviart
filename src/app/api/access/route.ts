import { NextResponse } from "next/server";
import { getAllowedEmail, isAdminTokenUser } from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = getBearerToken(authHeader);
  const user = await verifyFirebaseToken(authHeader);

  if (!token || !user?.email) {
    return NextResponse.json({ allowed: false, admin: false });
  }

  const record = await getAllowedEmail(token, user.email);

  return NextResponse.json({
    allowed: Boolean(record),
    admin: await isAdminTokenUser(token, user),
    email: user.email
  });
}
