import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { clearChallengeCookie, getChallengeCookie, setPasskeySession } from "@/lib/passkey-session";
import { getPasskey, toWebAuthnCredential } from "@/lib/passkeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const challenge = await getChallengeCookie("authentication");
    const response = (await request.json()) as AuthenticationResponseJSON;
    const passkey = await getPasskey(response.id);

    if (!challenge?.challenge || !passkey) {
      return NextResponse.json(
        {
          error:
            "Passkey no encontrada. Entra con Google o correo, pulsa Passkey y vuelve a intentarlo."
        },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: new URL(origin).hostname,
      credential: toWebAuthnCredential(passkey),
      requireUserVerification: true
    });

    await clearChallengeCookie();

    if (!verification.verified) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    await setPasskeySession(passkey.email, passkey.role);
    return NextResponse.json({ ok: true, email: passkey.email, role: passkey.role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo verificar la passkey." },
      { status: 500 }
    );
  }
}
