import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { isAllowedTokenUser } from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";
import { setChallengeCookie } from "@/lib/passkey-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = getBearerToken(authHeader);
  const user = await verifyFirebaseToken(authHeader);

  if (!token || !user?.email || !(await isAllowedTokenUser(token, user))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const origin = new URL(request.url).origin;
  const rpID = new URL(origin).hostname;
  const options = await generateRegistrationOptions({
    rpName: "Stream Qviart",
    rpID,
    userName: user.email,
    userID: new Uint8Array(Buffer.from(user.email)),
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required"
    }
  });

  await setChallengeCookie("registration", options.challenge, user.email);

  return NextResponse.json(options);
}
