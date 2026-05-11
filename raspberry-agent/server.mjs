import { createServer } from "node:http";
import { execFile } from "node:child_process";

const host = process.env.AGENT_HOST ?? "127.0.0.1";
const port = Number(process.env.AGENT_PORT ?? 8787);
const token = process.env.AGENT_TOKEN;
const command = process.env.STREAM_COMMAND;
const timeout = Number(process.env.COMMAND_TIMEOUT_MS ?? 20000);

if (!token || token.length < 16) {
  throw new Error("Configura AGENT_TOKEN con al menos 16 caracteres.");
}

if (!command) {
  throw new Error("Configura STREAM_COMMAND.");
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function runCommand() {
  return new Promise((resolve) => {
    execFile("sh", ["-lc", command], { timeout }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: typeof error?.code === "number" ? error.code : error ? 1 : 0,
        signal: error?.signal ?? null,
        stdout,
        stderr
      });
    });
  });
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/start") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (request.headers.authorization !== `Bearer ${token}`) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  const result = await runCommand();
  sendJson(response, result.ok ? 200 : 500, result);
});

server.listen(port, host, () => {
  console.log(`Raspberry agent listening on http://${host}:${port}/start`);
});
