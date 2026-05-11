import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPasskeySessionSecret } from "@/lib/config";

export const PASSKEY_SESSION_COOKIE = "sq_passkey_session";
export const PASSKEY_CHALLENGE_COOKIE = "sq_passkey_challenge";

type SignedPayload = {
  email?: string;
  challenge?: string;
  role?: "admin" | "user";
  purpose: "session" | "registration" | "authentication";
  exp: number;
};

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: SignedPayload) {
  const secret = getPasskeySessionSecret();
  if (!secret) throw new Error("Falta PASSKEY_SESSION_SECRET.");
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySignedPayload(value: string | undefined, purpose: SignedPayload["purpose"]) {
  if (!value) return null;
  const secret = getPasskeySessionSecret();
  if (!secret) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedPayload;
  if (payload.purpose !== purpose || payload.exp < Date.now()) return null;
  return payload;
}

export async function setChallengeCookie(
  purpose: "registration" | "authentication",
  challenge: string,
  email?: string
) {
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_CHALLENGE_COOKIE, signPayload({
    challenge,
    email,
    purpose,
    exp: Date.now() + 5 * 60 * 1000
  }), {
    httpOnly: true,
    maxAge: 5 * 60,
    path: "/",
    sameSite: "lax",
    secure: true
  });
}

export async function getChallengeCookie(purpose: "registration" | "authentication") {
  const cookieStore = await cookies();
  return verifySignedPayload(cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value, purpose);
}

export async function clearChallengeCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PASSKEY_CHALLENGE_COOKIE);
}

export async function setPasskeySession(email: string, role: "admin" | "user") {
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_SESSION_COOKIE, signPayload({
    email,
    role,
    purpose: "session",
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000
  }), {
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: true
  });
}

export async function getPasskeySession() {
  const cookieStore = await cookies();
  const payload = verifySignedPayload(cookieStore.get(PASSKEY_SESSION_COOKIE)?.value, "session");
  if (!payload?.email) return null;
  return { email: payload.email, role: payload.role ?? "user" };
}

export async function clearPasskeySession() {
  const cookieStore = await cookies();
  cookieStore.delete(PASSKEY_SESSION_COOKIE);
}
