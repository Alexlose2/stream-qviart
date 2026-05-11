"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";

type StartState = "idle" | "pending" | "ready" | "error";

type StreamControlsProps = {
  canStopStream?: boolean;
  streamUrl?: string;
  streamKind: "hls" | "iframe" | "video";
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

function StopIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path d="M8 8h8v8H8z" fill="currentColor" />
    </svg>
  );
}

function HlsPlayer({
  onStatus,
  reloadKey,
  streamUrl
}: {
  onStatus: (message: string) => void;
  reloadKey: number;
  streamUrl: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hlsInstance: { destroy: () => void } | undefined;
    let cancelled = false;

    const reportVideoState = (label: string) => {
      onStatus(
        [
          `Reproductor: ${label}`,
          `readyState=${video.readyState}`,
          `networkState=${video.networkState}`,
          video.error ? `mediaError=${video.error.code}` : ""
        ]
          .filter(Boolean)
          .join("\n")
      );
    };

    const onCanPlay = () => reportVideoState("canplay");
    const onError = () => reportVideoState("media error");
    const onLoadedMetadata = () => reportVideoState("metadata cargada");
    const onPlaying = () => reportVideoState("reproduciendo");
    const onWaiting = () => reportVideoState("esperando datos");

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);

    async function loadStream() {
      if (!video) return;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        onStatus("Reproductor: HLS nativo");
        video.src = streamUrl;
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (cancelled || !Hls.isSupported()) {
        onStatus("Reproductor: hls.js no soportado, usando video directo");
        video.src = streamUrl;
        return;
      }

      onStatus("Reproductor: cargando HLS con hls.js");

      const hls = new Hls({
        backBufferLength: 30,
        enableWorker: true,
        liveMaxLatencyDurationCount: 12,
        liveSyncDurationCount: 6,
        lowLatencyMode: false
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        onStatus(`Reproductor: manifest cargado\nniveles=${data.levels.length}`);
      });
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        onStatus(`Reproductor: segmento cargado\nsn=${data.frag.sn}`);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        onStatus(
          [
            "Reproductor: error HLS",
            `type=${data.type}`,
            `details=${data.details}`,
            `fatal=${data.fatal ? "si" : "no"}`
          ].join("\n")
        );
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsInstance = hls;
    }

    void loadStream();

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      hlsInstance?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [onStatus, reloadKey, streamUrl]);

  return <video ref={videoRef} controls playsInline />;
}

export function StreamControls({ canStopStream = false, streamKind, streamUrl, user }: StreamControlsProps) {
  const [state, setState] = useState<StartState>("idle");
  const [message, setMessage] = useState("Todavia no se ha enviado ningun comando.");
  const [frameKey, setFrameKey] = useState(0);

  const reportPlayerStatus = useCallback((playerMessage: string) => {
    setMessage((current) => `${current.split("\n\nReproductor:")[0]}\n\n${playerMessage}`);
  }, []);

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

  async function stopStream() {
    setState("pending");
    setMessage("Parando la transmision...");

    try {
      const token = user ? await user.getIdToken() : null;
      const response = await fetch("/api/stream/stop", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo parar la transmision.");
      }

      setState(payload.ok ? "idle" : "error");
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
            streamKind === "hls" ? (
              <HlsPlayer
                key={frameKey}
                onStatus={reportPlayerStatus}
                reloadKey={frameKey}
                streamUrl={streamUrl}
              />
            ) : streamKind === "video" ? (
              <video key={frameKey} controls playsInline>
                <source src={streamUrl} type="video/mp4" />
              </video>
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

        {canStopStream ? (
          <button
            className="danger-button"
            disabled={state === "pending"}
            onClick={stopStream}
            type="button"
          >
            <StopIcon />
            Parar transmision
          </button>
        ) : null}

        <pre className="command-output">{message}</pre>
      </aside>
    </div>
  );
}
