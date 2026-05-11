"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  createEmailAccount,
  getFirebaseAuth,
  isFirebaseConfigured,
  signInWithEmail,
  signInWithGoogle,
  signOutOfFirebase
} from "@/lib/firebase-client";
import { StreamControls } from "@/components/StreamControls";

type StreamAppProps = {
  allowedEmails: string[];
  streamUrl?: string;
  streamKind: "hls" | "iframe" | "video";
};

type AccessState = {
  allowed: boolean;
  admin: boolean;
  loading: boolean;
};

type AllowedEmailRecord = {
  email: string;
  passkeyCount?: number;
  role: "admin" | "user";
  source?: "env" | "firestore";
};

type ApiPayload = Record<string, unknown> & {
  admin?: boolean;
  allowed?: boolean;
  email?: string;
  emails?: AllowedEmailRecord[];
  error?: string;
  role?: "admin" | "user";
};

type PasskeyAuthenticationOptions = NonNullable<Parameters<typeof startAuthentication>[0]>["optionsJSON"];
type PasskeyRegistrationOptions = NonNullable<Parameters<typeof startRegistration>[0]>["optionsJSON"];

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

async function fetchWithFirebaseToken(user: User, input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });
}

async function readApiJson(response: Response): Promise<ApiPayload> {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text.length > 220 ? `${text.slice(0, 220)}...` : text
    };
  }
}

function EmailPasswordForm({
  onError
}: {
  onError: (message: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    onError(null);

    try {
      if (mode === "signup") {
        await createEmailAccount(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo completar el acceso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Correo
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        Contrasena
        <input
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <button className="primary-button" disabled={isSubmitting} type="submit">
        {mode === "signup" ? "Crear cuenta" : "Entrar"}
      </button>
      <button
        className="secondary-button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        type="button"
      >
        {mode === "signup" ? "Ya tengo cuenta" : "Crear cuenta con correo autorizado"}
      </button>
    </form>
  );
}

function AdminPanel({ user }: { user: User }) {
  const [emails, setEmails] = useState<AllowedEmailRecord[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadEmails() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetchWithFirebaseToken(user, "/api/admin/allowed-emails");
      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la lista.");
      setEmails(payload.emails ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la lista.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  async function addEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await fetchWithFirebaseToken(user, "/api/admin/allowed-emails", {
      method: "POST",
      body: JSON.stringify({ email: newEmail, role: newRole })
    });
    const payload = await readApiJson(response);
    if (!response.ok) {
      setMessage(payload.error ?? "No se pudo guardar.");
      return;
    }
    setNewEmail("");
    await loadEmails();
  }

  async function removeEmail(email: string) {
    setMessage(null);
    const response = await fetchWithFirebaseToken(user, "/api/admin/allowed-emails", {
      method: "DELETE",
      body: JSON.stringify({ email })
    });
    const payload = await readApiJson(response);
    if (!response.ok) {
      setMessage(payload.error ?? "No se pudo eliminar.");
      return;
    }
    await loadEmails();
  }

  return (
    <section className="admin-panel">
      <div>
        <h1>Admin</h1>
        <p>Autoriza correos para que puedan entrar con Google o con correo y contrasena.</p>
      </div>

      <form className="admin-form" onSubmit={addEmail}>
        <input
          onChange={(event) => setNewEmail(event.target.value)}
          placeholder="correo@dominio.com"
          required
          type="email"
          value={newEmail}
        />
        <select onChange={(event) => setNewRole(event.target.value as "admin" | "user")} value={newRole}>
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
        </select>
        <button className="primary-button" type="submit">
          Anadir
        </button>
      </form>

      {message ? <p className="admin-message">{message}</p> : null}

      <div className="admin-list">
        {isLoading ? <p>Cargando...</p> : null}
        {!isLoading && emails.length === 0 ? <p>No hay usuarios autorizados todavia.</p> : null}
        {emails.map((record) => (
          <div className="admin-row" key={record.email}>
            <div>
              <strong>{record.email}</strong>
              <span>
                {record.role === "admin" ? "Admin" : "Usuario"} ·{" "}
                {record.source === "env" ? "Base" : "Firestore"} ·{" "}
                {record.passkeyCount ? `${record.passkeyCount} passkey` : "Sin passkey"}
              </span>
            </div>
            <button
              className="danger-button"
              disabled={record.source === "env"}
              onClick={() => removeEmail(record.email)}
              type="button"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StreamApp({ allowedEmails, streamKind, streamUrl }: StreamAppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AccessState>({
    allowed: false,
    admin: false,
    loading: true
  });
  const [activeTab, setActiveTab] = useState<"stream" | "admin">("stream");
  const [error, setError] = useState<string | null>(null);
  const [passkeyEmail, setPasskeyEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      setAccess({ allowed: false, admin: false, loading: false });
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAccess({ allowed: false, admin: false, loading: Boolean(nextUser) });
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    async function loadAccess() {
      try {
        const response = await fetchWithFirebaseToken(currentUser, "/api/access");
        const payload = await readApiJson(response);
        setAccess({
          allowed: Boolean(payload.allowed),
          admin: Boolean(payload.admin),
          loading: false
        });
      } catch {
        setAccess({
          allowed: allowedEmails.includes(currentUser.email?.toLowerCase() ?? ""),
          admin: allowedEmails.includes(currentUser.email?.toLowerCase() ?? ""),
          loading: false
        });
      }
    }

    void loadAccess();
  }, [allowedEmails, user]);

  const accountLabel = useMemo(() => {
    if (!user) return passkeyEmail ?? "Cuenta";
    return user.displayName ?? user.email ?? "Cuenta";
  }, [passkeyEmail, user]);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesion.");
    }
  }

  async function handlePasskeySignIn() {
    setError(null);
    try {
      const optionsResponse = await fetch("/api/passkeys/authenticate/options", {
        method: "POST"
      });
      const options = (await readApiJson(optionsResponse)) as unknown as PasskeyAuthenticationOptions & { error?: string };
      if (!optionsResponse.ok) throw new Error(options.error ?? "No se pudo iniciar passkey.");

      const credential = await startAuthentication({ optionsJSON: options });
      const verifyResponse = await fetch("/api/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential)
      });
      const payload = await readApiJson(verifyResponse);
      if (!verifyResponse.ok) throw new Error(payload.error ?? "No se pudo verificar passkey.");

      setPasskeyEmail(payload.email ?? "Passkey");
      setAccess({ allowed: true, admin: payload.role === "admin", loading: false });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo entrar con passkey.");
    }
  }

  async function handleRegisterPasskey() {
    if (!user) return;
    setError(null);
    try {
      const optionsResponse = await fetchWithFirebaseToken(user, "/api/passkeys/register/options", {
        method: "POST"
      });
      const options = (await readApiJson(optionsResponse)) as unknown as PasskeyRegistrationOptions & { error?: string };
      if (!optionsResponse.ok) throw new Error(options.error ?? "No se pudo crear la passkey.");

      const credential = await startRegistration({ optionsJSON: options });
      const verifyResponse = await fetchWithFirebaseToken(user, "/api/passkeys/register/verify", {
        method: "POST",
        body: JSON.stringify(credential)
      });
      const payload = await readApiJson(verifyResponse);
      if (!verifyResponse.ok) throw new Error(payload.error ?? "No se pudo verificar la passkey.");
      setError("Passkey guardada en este dispositivo.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar la passkey.");
    }
  }

  async function handleSignOut() {
    await fetch("/api/passkeys/session", { method: "DELETE" }).catch(() => undefined);
    await signOutOfFirebase();
    setPasskeyEmail(null);
    setAccess({ allowed: false, admin: false, loading: false });
    setActiveTab("stream");
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

        {user || passkeyEmail ? (
          <div className="account">
            {user?.photoURL ? (
              <Image alt="" className="avatar" height={38} src={user.photoURL} width={38} />
            ) : null}
            <div>
              <p className="account-name">{accountLabel}</p>
              <p className="account-email">{user?.email ?? "Passkey"}</p>
            </div>
            {user ? (
              <button className="secondary-button" onClick={handleRegisterPasskey} type="button">
                Passkey
              </button>
            ) : null}
            <button className="secondary-button" onClick={handleSignOut} type="button">
              <SignOutIcon />
              Salir
            </button>
          </div>
        ) : null}
      </header>

      {(user || passkeyEmail) && access.allowed ? (
        <>
          <nav className="tabbar" aria-label="Secciones">
            <button
              className={activeTab === "stream" ? "active" : ""}
              onClick={() => setActiveTab("stream")}
              type="button"
            >
              Stream
            </button>
            {access.admin ? (
              <button
                className={activeTab === "admin" ? "active" : ""}
                onClick={() => setActiveTab("admin")}
                type="button"
              >
                Admin
              </button>
            ) : null}
          </nav>
          {activeTab === "admin" && access.admin && user ? (
            <AdminPanel user={user} />
          ) : (
            <StreamControls
              canStopStream={access.admin}
              streamKind={streamKind}
              streamUrl={streamUrl}
              user={user}
            />
          )}
        </>
      ) : (
        <main className="auth-card">
          <section className="auth-panel">
            <h1>Acceso privado</h1>
            <p>
              Inicia sesion con Google o con correo y contrasena. Solo las cuentas
              autorizadas podran arrancar la Raspberry.
            </p>
            <button
              className="primary-button"
              disabled={!isFirebaseConfigured || access.loading}
              onClick={handleGoogleSignIn}
              type="button"
            >
              <GoogleIcon />
              Entrar con Google
            </button>
            <button
              className="secondary-button"
              disabled={!isFirebaseConfigured || access.loading}
              onClick={handlePasskeySignIn}
              type="button"
            >
              Entrar con passkey
            </button>
            <div className="divider">o</div>
            <EmailPasswordForm onError={setError} />
            {!isFirebaseConfigured ? (
              <p>Faltan las variables publicas de Firebase en Vercel.</p>
            ) : null}
            {user && !access.loading && !access.allowed ? (
              <p>Tu cuenta no esta autorizada todavia.</p>
            ) : null}
            {error ? <p>{error}</p> : null}
          </section>
        </main>
      )}
    </div>
  );
}
