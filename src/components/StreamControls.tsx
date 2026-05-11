"use client";

import { useMemo, useState } from "react";
import type { User } from "firebase/auth";

type StartState = "idle" | "pending" | "ready" | "error";

type StreamControlsProps = {
  streamUrl?: string;
  streamKind: "iframe" | "video";
  user?: User | null;
};

function PlayIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path
        d="M21 12a9 9 0 0 1-15.3 6.4M3 12A9 9 0 0 1 18.3 5.6M18 2v4h-4M6 22v-4h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function StreamControls({ streamKind, streamUrl, user }: StreamControlsProps) {
  const [state, setState] = useState<StartState>("idle");
  const [message, setMessage] = useState("Todavia no se ha enviado ningun comando.");
  const [frameKey, setFrameKey] = useState(0);

  const statusLabel = useMemo(() => {
    if (state === "pending") return "Arrancando";
    if (state === "ready") return "Listo";
    if (state === "error") return "Error";
    return "En espera";
  }, [state]);

  async function startStream() {
    setState("pending");
    setMessage("Conectando con la Raspberry...");

    try {
      const token = user ? await user.getIdToken() : null;
      const response = await fetch("/api/stream/start", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo arrancar la transmision.");
      }

      setState(payload.ok ? "ready" : "error");
      setFrameKey((current) => current + 1);
      setMessage(
        [
          `Estado: ${payload.status}`,
          payload.stdout ? `STDOUT:\n${payload.stdout}` : "",
          payload.stderr ? `STDERR:\n${payload.stderr}` : ""
        ]
          .filter(Boolean)
          .join("\n\n")
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Error desconocido.");
    }
  }

  return (
    <div className="dashboard">
      <main>
        <section className="hero-copy">
          <h1>Stream Qviart</h1>
          <p>
            Acceso privado para arrancar la transmision de la capturadora solo
            cuando quieras verla y cargar el reproductor desde la red.
          </p>
        </section>

        <section className="stream-frame" aria-label="Reproductor de stream">
          {streamUrl ? (
            streamKind === "video" ? (
              <video key={frameKey} controls playsInline src={streamUrl} />
            ) : (
              <iframe
                key={frameKey}
                allow="autoplay; fullscreen; picture-in-picture"
                src={streamUrl}
                title="Stream de la Raspberry"
              />
            )
          ) : (
            <div className="stream-placeholder">
              Configura NEXT_PUBLIC_STREAM_URL para cargar aqui el reproductor.
            </div>
          )}
        </section>

        <div className="details-grid">
          <article className="details-panel">
            <h2>Acceso</h2>
            <p>Solo entran las cuentas incluidas en ALLOWED_EMAILS.</p>
          </article>
          <article className="details-panel">
            <h2>Raspberry</h2>
            <p>El comando se ejecuta por SSH desde una ruta API protegida.</p>
          </article>
          <article className="details-panel">
            <h2>Video</h2>
            <p>El proceso de captura se inicia bajo demanda.</p>
          </article>
        </div>
      </main>

      <aside className="control-panel">
        <div className="status-row">
          <strong>Control remoto</strong>
          <span className="status-pill">
            <span className={`status-dot ${state}`} />
            {statusLabel}
          </span>
        </div>

        <button
          className="primary-button"
          disabled={state === "pending"}
          onClick={startStream}
          type="button"
        >
          <PlayIcon />
          Arrancar transmision
        </button>

        <button
          className="secondary-button"
          onClick={() => setFrameKey((current) => current + 1)}
          type="button"
        >
          <RefreshIcon />
          Recargar reproductor
        </button>

        <pre className="command-output">{message}</pre>
      </aside>
    </div>
  );
}
