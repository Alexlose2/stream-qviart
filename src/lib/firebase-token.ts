import { createRemoteJWKSet, jwtVerify } from "jose";
import { getFirebaseProjectId, isEmailAllowed } from "@/lib/config";

const firebaseJwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

type FirebaseTokenPayload = {
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

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return null;
  }

  const { payload } = await jwtVerify<FirebaseTokenPayload>(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  });

  if (!payload.email_verified || !isEmailAllowed(payload.email)) {
    return null;
  }

  return payload;
}
