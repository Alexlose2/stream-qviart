import { getServerSession } from "next-auth";
import Image from "next/image";
import { AuthAction } from "@/components/AuthAction";
import { StreamControls } from "@/components/StreamControls";
import { authOptions } from "@/lib/auth";
import { env, isEmailAllowed } from "@/lib/config";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthorized = isEmailAllowed(session?.user.email);
  const isOAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

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

        {session?.user ? (
          <div className="account">
            {session.user.image ? (
              <Image
                alt=""
                className="avatar"
                height={38}
                src={session.user.image}
                width={38}
              />
            ) : null}
            <div>
              <p className="account-name">{session.user.name ?? "Cuenta Google"}</p>
              <p className="account-email">{session.user.email}</p>
            </div>
            <AuthAction mode="sign-out" />
          </div>
        ) : null}
      </header>

      {isAuthorized ? (
        <StreamControls
          streamKind={env.NEXT_PUBLIC_STREAM_KIND}
          streamUrl={env.NEXT_PUBLIC_STREAM_URL}
        />
      ) : (
        <main className="auth-card">
          <section className="auth-panel">
            <h1>Acceso privado</h1>
            <p>
              Inicia sesion con Google para abrir el panel de stream. Solo las
              cuentas autorizadas podran arrancar la Raspberry.
            </p>
            <AuthAction disabled={!isOAuthConfigured} mode="sign-in" />
            {!isOAuthConfigured ? (
              <p>
                Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el
                entorno de Vercel.
              </p>
            ) : null}
            {session?.user && !isAuthorized ? (
              <p>Tu cuenta no esta incluida en ALLOWED_EMAILS.</p>
            ) : null}
          </section>
        </main>
      )}
    </div>
  );
}
