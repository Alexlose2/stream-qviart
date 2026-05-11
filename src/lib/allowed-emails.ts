import { getAllowedEmails, getFirebaseProjectId } from "@/lib/config";
import type { FirebaseTokenPayload } from "@/lib/firebase-token";

export type AllowedEmailRecord = {
  email: string;
  role: "admin" | "user";
  source?: "env" | "firestore";
};

type FirestoreDocument = {
  name: string;
  fields?: {
    email?: { stringValue?: string };
    role?: { stringValue?: string };
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAllowedEmailId(email: string) {
  return normalizeEmail(email);
}

export function isBootstrapAdmin(email?: string | null) {
  if (!email) return false;
  return getAllowedEmails().includes(normalizeEmail(email));
}

function getFirestoreBaseUrl() {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Falta FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function parseAllowedEmail(document: FirestoreDocument): AllowedEmailRecord | null {
  const email = document.fields?.email?.stringValue;
  const role = document.fields?.role?.stringValue === "admin" ? "admin" : "user";
  if (!email) return null;
  return { email: normalizeEmail(email), role, source: "firestore" };
}

async function firestoreRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${getFirestoreBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Firestore respondio con HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getAllowedEmail(token: string, email: string) {
  if (isBootstrapAdmin(email)) {
    return { email: normalizeEmail(email), role: "admin", source: "env" } satisfies AllowedEmailRecord;
  }

  try {
    const document = await firestoreRequest<FirestoreDocument>(
      `/allowedEmails/${getAllowedEmailId(email)}`,
      token
    );
    return parseAllowedEmail(document);
  } catch {
    return null;
  }
}

export async function isAllowedTokenUser(token: string, user: FirebaseTokenPayload | null) {
  if (!user?.email) return false;
  return Boolean(await getAllowedEmail(token, user.email));
}

export async function isAdminTokenUser(token: string, user: FirebaseTokenPayload | null) {
  if (!user?.email) return false;
  const record = await getAllowedEmail(token, user.email);
  return record?.role === "admin";
}

export async function listAllowedEmails(token: string) {
  const response = await firestoreRequest<{ documents?: FirestoreDocument[] }>(
    "/allowedEmails?pageSize=100",
    token
  );
  const records = (response.documents ?? [])
    .map(parseAllowedEmail)
    .filter((record): record is AllowedEmailRecord => Boolean(record));

  const bootstrapAdmins = getAllowedEmails().map((email) => ({
    email,
    role: "admin" as const,
    source: "env" as const
  }));

  const merged = new Map<string, AllowedEmailRecord>();
  [...records, ...bootstrapAdmins].forEach((record) => merged.set(record.email, record));
  return Array.from(merged.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function saveAllowedEmail(token: string, email: string, role: "admin" | "user") {
  const normalizedEmail = normalizeEmail(email);
  return firestoreRequest<FirestoreDocument>(
    `/allowedEmails/${getAllowedEmailId(normalizedEmail)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          email: { stringValue: normalizedEmail },
          role: { stringValue: role }
        }
      })
    }
  );
}

export async function deleteAllowedEmail(token: string, email: string) {
  return firestoreRequest<Record<string, never>>(
    `/allowedEmails/${getAllowedEmailId(email)}`,
    token,
    { method: "DELETE" }
  );
}
