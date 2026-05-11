import { Client } from "ssh2";
import { env, getMissingRuntimeConfig } from "@/lib/config";

export type StreamCommandResult = {
  ok: boolean;
  code: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
};

export type StreamCommandAction = "start" | "stop";

function getPrivateKey() {
  return env.RPI_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function getAgentActionUrl(action: StreamCommandAction, agentUrl: string) {
  if (action === "start") return agentUrl;

  const url = new URL(agentUrl);
  url.pathname = url.pathname.replace(/\/start\/?$/, "/stop");
  return url.toString();
}

export async function runStreamCommand(action: StreamCommandAction = "start"): Promise<StreamCommandResult> {
  if (env.DEMO_MODE) {
    return {
      ok: true,
      code: 0,
      signal: null,
      stdout: `DEMO_MODE activo: comando ${action} simulado correctamente.`,
      stderr: ""
    };
  }

  const missing = getMissingRuntimeConfig();

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }

  if (env.RPI_AGENT_URL) {
    const response = await fetch(getAgentActionUrl(action, env.RPI_AGENT_URL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RPI_AGENT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action }),
      signal: AbortSignal.timeout(env.RPI_COMMAND_TIMEOUT_MS)
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<StreamCommandResult> & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? `El agente respondio con HTTP ${response.status}.`);
    }

    return {
      ok: Boolean(payload.ok),
      code: payload.code ?? null,
      signal: payload.signal ?? null,
      stdout: payload.stdout ?? "",
      stderr: payload.stderr ?? ""
    };
  }

  return new Promise((resolve, reject) => {
    const connection = new Client();
    const timeout = setTimeout(() => {
      connection.end();
      reject(new Error("Timeout conectando o ejecutando el comando en la Raspberry."));
    }, env.RPI_COMMAND_TIMEOUT_MS);

    connection
      .on("ready", () => {
        connection.exec(
          action === "stop"
            ? "pkill -f 'ffmpeg .*qviart-hls' 2>/dev/null || true; pkill -f 'python3 -m http.server 8093' 2>/dev/null || true"
            : env.RPI_STREAM_COMMAND!,
          (error, stream) => {
            if (error) {
              clearTimeout(timeout);
              connection.end();
              reject(error);
              return;
            }

            let stdout = "";
            let stderr = "";

            stream
              .on("close", (code: number | null, signal: string | null) => {
                clearTimeout(timeout);
                connection.end();
                resolve({
                  ok: code === 0,
                  code,
                  signal,
                  stdout,
                  stderr
                });
              })
              .on("data", (chunk: Buffer) => {
                stdout += chunk.toString();
              });

            stream.stderr.on("data", (chunk: Buffer) => {
              stderr += chunk.toString();
            });
          }
        );
      })
      .on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      })
      .connect({
        host: env.RPI_HOST,
        port: env.RPI_PORT,
        username: env.RPI_USERNAME,
        privateKey: getPrivateKey(),
        password: env.RPI_PASSWORD,
        readyTimeout: Math.min(env.RPI_COMMAND_TIMEOUT_MS, 12000)
      });
  });
}
