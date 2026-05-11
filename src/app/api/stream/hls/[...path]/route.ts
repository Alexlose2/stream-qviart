import { env } from "@/lib/config";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4"
};

function getContentType(path: string) {
  const extension = Object.keys(contentTypes).find((suffix) => path.endsWith(suffix));
  return extension ? contentTypes[extension] : "application/octet-stream";
}

function rewritePlaylist(text: string) {
  const lines = text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || /^https?:\/\//i.test(trimmed)) {
        return line;
      }

      return `/api/stream/hls/${trimmed.replace(/^\/+/, "")}`;
    });

  if (!lines.some((line) => line.startsWith("#EXT-X-STREAM-INF"))) {
    return lines.join("\n");
  }

  return lines
    .map((line) => {
      if (!line.startsWith("#EXT-X-STREAM-INF") || line.includes("CODECS=")) {
        return line;
      }

      return `${line},CODECS="avc1.640028,mp4a.40.2"`;
    })
    .join("\n");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  if (!env.RPI_HLS_BASE_URL) {
    return Response.json({ error: "Falta RPI_HLS_BASE_URL." }, { status: 500 });
  }

  const { path = [] } = await context.params;
  const streamPath = path.join("/") || "index.m3u8";
  const upstreamUrl = new URL(streamPath, `${env.RPI_HLS_BASE_URL.replace(/\/+$/, "")}/`);
  upstreamUrl.search = request.nextUrl.search;

  const upstream = await fetch(upstreamUrl, {
    cache: "no-store",
    headers: { Accept: "*/*" }
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text().catch(() => ""), {
      headers: { "Cache-Control": "no-store" },
      status: upstream.status
    });
  }

  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": getContentType(streamPath)
  });

  if (streamPath.endsWith(".m3u8")) {
    return new Response(rewritePlaylist(await upstream.text()), { headers });
  }

  return new Response(upstream.body, { headers });
}
