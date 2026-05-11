import { createRemoteJWKSet, jwtVerify } from "jose";
import { getFirebaseProjectId } from "@/lib/config";

const firebaseJwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export type FirebaseTokenPayload = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  user_id?: string;
};

export async function verifyFirebaseToken(authHeader: string | null) {
  const projectId = getFirebaseProjectId();

  if (!projectId) {
    throw new Error("Falta FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }

  const token = getBearerToken(authHeader);

  if (!token) {
    return null;
  }

  const { payload } = await jwtVerify<FirebaseTokenPayload>(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  });

  if (!payload.email_verified) {
    return null;
  }

  return payload;
}

export function getBearerToken(authHeader: string | null) {
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}
