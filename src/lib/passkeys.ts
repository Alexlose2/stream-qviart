import type { AuthenticatorTransportFuture, WebAuthnCredential } from "@simplewebauthn/server";
import { getFirebaseProjectId } from "@/lib/config";

export type StoredPasskey = {
  id: string;
  email: string;
  role: "admin" | "user";
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
};

export type PasskeySummary = {
  id: string;
  email: string;
  role: "admin" | "user";
};

type FirestoreDocument = {
  name: string;
  fields?: {
    id?: { stringValue?: string };
    email?: { stringValue?: string };
    publicKey?: { stringValue?: string };
    role?: { stringValue?: string };
    counter?: { integerValue?: string };
  };
};

function getFirestoreBaseUrl() {
  const projectId = getFirebaseProjectId();
  if (!projectId) throw new Error("Falta FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function parsePasskey(document: FirestoreDocument): StoredPasskey | null {
  const id = document.fields?.id?.stringValue;
  const email = document.fields?.email?.stringValue;
  const publicKey = document.fields?.publicKey?.stringValue;
  if (!id || !email || !publicKey) return null;
  return {
    id,
    email,
    role: document.fields?.role?.stringValue === "admin" ? "admin" : "user",
    publicKey,
    counter: Number(document.fields?.counter?.integerValue ?? 0)
  };
}

export function toWebAuthnCredential(passkey: StoredPasskey): WebAuthnCredential {
  return {
    id: passkey.id,
    publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
    counter: passkey.counter,
    transports: passkey.transports
  };
}

export async function getPasskey(id: string) {
  const response = await fetch(`${getFirestoreBaseUrl()}/passkeys/${id}`, {
    cache: "no-store"
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "Firestore esta bloqueando la lectura de passkeys. Revisa las reglas de Firestore para permitir get en passkeys."
        : await response.text()
    );
  }
  return parsePasskey((await response.json()) as FirestoreDocument);
}

export async function listPasskeys(token: string) {
  const response = await fetch(`${getFirestoreBaseUrl()}/passkeys?pageSize=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) throw new Error(await response.text());

  const payload = (await response.json()) as { documents?: FirestoreDocument[] };
  return (payload.documents ?? [])
    .map(parsePasskey)
    .filter((passkey): passkey is StoredPasskey => Boolean(passkey))
    .map((passkey): PasskeySummary => ({
      id: passkey.id,
      email: passkey.email.toLowerCase(),
      role: passkey.role
    }));
}

export async function savePasskey(token: string, passkey: StoredPasskey) {
  const response = await fetch(`${getFirestoreBaseUrl()}/passkeys/${passkey.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: {
        id: { stringValue: passkey.id },
        email: { stringValue: passkey.email },
        role: { stringValue: passkey.role },
        publicKey: { stringValue: passkey.publicKey },
        counter: { integerValue: String(passkey.counter) }
      }
    })
  });

  if (!response.ok) throw new Error(await response.text());
}
