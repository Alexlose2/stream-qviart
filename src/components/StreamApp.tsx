"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  signInWithGoogle,
  signOutOfFirebase
} from "@/lib/firebase-client";
import { StreamControls } from "@/components/StreamControls";

type StreamAppProps = {
  allowedEmails: string[];
  streamUrl?: string;
  streamKind: "iframe" | "video";
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.89-1.74 2.99-4.3 2.99-7.43Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.51c-.9.6-2.04.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.06v2.59A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.39 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.88V7.53H3.06A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.06 4.47l3.33-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.99c1.47 0 2.79.51 3.83 1.5l2.85-2.85C16.95 3.03 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.53l3.33 2.59C7.18 7.75 9.39 5.99 12 5.99Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path
        d="M15 17l5-5-5-5M20 12H9M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function StreamApp({ allowedEmails, streamKind, streamUrl }: StreamAppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      setIsLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const isAuthorized = useMemo(() => {
    if (!user?.email) return false;
    return allowedEmails.includes(user.email.toLowerCase());
  }, [allowedEmails, user?.email]);

  async function handleSignIn() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesion.");
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">SQ</div>
          <div>
            <p className="brand-title">Stream Qviart</p>
            <p className="brand-subtitle">Raspberry capture control</p>
          </div>
        </div>

        {user ? (
          <div className="account">
            {user.photoURL ? (
              <Image
                alt=""
                className="avatar"
                height={38}
                src={user.photoURL}
                width={38}
              />
            ) : null}
            <div>
              <p className="account-name">{user.displayName ?? "Cuenta Google"}</p>
              <p className="account-email">{user.email}</p>
            </div>
            <button className="secondary-button" onClick={signOutOfFirebase} type="button">
              <SignOutIcon />
              Salir
            </button>
          </div>
        ) : null}
      </header>

      {user && isAuthorized ? (
        <StreamControls streamKind={streamKind} streamUrl={streamUrl} user={user} />
      ) : (
        <main className="auth-card">
          <section className="auth-panel">
            <h1>Acceso privado</h1>
            <p>
              Inicia sesion con Google desde Firebase. Solo las cuentas
              autorizadas podran arrancar la Raspberry.
            </p>
            <button
              className="primary-button"
              disabled={!isFirebaseConfigured || isLoading}
              onClick={handleSignIn}
              type="button"
            >
              <GoogleIcon />
              Entrar con Google
            </button>
            {!isFirebaseConfigured ? (
              <p>Faltan las variables publicas de Firebase en Vercel.</p>
            ) : null}
            {user && !isAuthorized ? <p>Tu cuenta no esta incluida en ALLOWED_EMAILS.</p> : null}
            {error ? <p>{error}</p> : null}
          </section>
        </main>
      )}
    </div>
  );
}
