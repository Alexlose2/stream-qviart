import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getAllowedEmail, isAllowedTokenUser } from "@/lib/allowed-emails";
import { getBearerToken, verifyFirebaseToken } from "@/lib/firebase-token";
import { clearChallengeCookie, getChallengeCookie } from "@/lib/passkey-session";
import { savePasskey } from "@/lib/passkeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = getBearerToken(authHeader);
  const user = await verifyFirebaseToken(authHeader);
  const challenge = await getChallengeCookie("registration");

  if (!token || !user?.email || !(await isAllowedTokenUser(token, user)) || !challenge?.challenge) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const response = (await request.json()) as RegistrationResponseJSON;
  const origin = new URL(request.url).origin;

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: new URL(origin).hostname,
    requireUserVerification: true
  });

  await clearChallengeCookie();

  if (!verification.verified) {
    return NextResponse.json({ error: "No se pudo verificar la passkey." }, { status: 400 });
  }

  const credential = verification.registrationInfo.credential;
  const accessRecord = await getAllowedEmail(token, user.email);
  await savePasskey(token, {
    id: credential.id,
    email: user.email,
    role: accessRecord?.role ?? "user",
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter
  });

  return NextResponse.json({ ok: true });
}
