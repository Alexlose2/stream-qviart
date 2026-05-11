import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { setChallengeCookie } from "@/lib/passkey-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const options = await generateAuthenticationOptions({
    rpID: new URL(origin).hostname,
    userVerification: "required"
  });

  await setChallengeCookie("authentication", options.challenge);

  return NextResponse.json(options);
}
