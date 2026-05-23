import { type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { Readable } from "node:stream";

export const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

export function toWebRequest(req: IncomingMessage, defaultPort: number): Request {
  const host = req.headers.host ?? `localhost:${defaultPort}`;
  const url = new URL(req.url ?? "/", `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  const method = req.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = { method, headers };
  if (hasBody) {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }
  return new Request(url, init);
}

export async function sendWebResponse(
  webRes: Response,
  res: ServerResponse,
): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  distDir: string,
): boolean {
  if (!existsSync(distDir)) return false;
  const rawPath = (req.url ?? "/").split("?")[0] ?? "/";
  let urlPath: string;
  try {
    urlPath = decodeURIComponent(rawPath);
  } catch {
    res.statusCode = 400;
    res.end("Bad Request");
    return true;
  }
  // Reject null bytes and any traversal segments outright.
  if (urlPath.includes("\0") || /(^|[\\/])\.\.([\\/]|$)/.test(urlPath)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }
  // Strip leading slashes/backslashes so join treats it as relative to distDir.
  const rel = urlPath.replace(/^[\\/]+/, "");
  const candidate = resolve(distDir, rel);
  // CodeQL-recognized path-traversal sanitizer: ensure the candidate is inside distDir.
  const relFromDist = relative(distDir, candidate);
  if (relFromDist.startsWith("..") || isAbsolute(relFromDist)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }
  // Always re-join from the trusted base using the validated relative segment.
  const safePath = relFromDist === "" ? distDir : join(distDir, relFromDist);
  let filePath = safePath;
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDir, "index.html");
    if (!existsSync(filePath)) return false;
  }
  const ext = extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  createReadStream(filePath).pipe(res);
  return true;
}
