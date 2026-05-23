import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { getMigrations } from "better-auth/db/migration";
import { auth, authOptions } from "./auth.ts";
import { db } from "./db.ts";

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = resolve(process.cwd(), "dist");

const MIME_TYPES: Record<string, string> = {
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

function toWebRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? `localhost:${PORT}`;
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

async function sendWebResponse(webRes: Response, res: ServerResponse): Promise<void> {
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

type PublicUserRow = {
  id: string;
  name: string;
  role: string | null;
  username: string | null;
  displayUsername: string | null;
};

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>,
): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.end(JSON.stringify(body));
}

function listPublicUsers(): PublicUserRow[] {
  return db
    .prepare(
      `SELECT "id", "name", "role", "username", "displayUsername"
       FROM "user"
       ORDER BY COALESCE("displayUsername", "username", "name", "email") COLLATE NOCASE ASC`,
    )
    .all() as PublicUserRow[];
}

function serveStatic(req: IncomingMessage, res: ServerResponse): boolean {
  if (!existsSync(DIST_DIR)) return false;
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
  // Strip leading slashes/backslashes so join treats it as relative to DIST_DIR.
  const rel = urlPath.replace(/^[\\/]+/, "");
  const candidate = resolve(DIST_DIR, rel);
  // CodeQL-recognized path-traversal sanitizer: ensure the candidate is inside DIST_DIR.
  const relFromDist = relative(DIST_DIR, candidate);
  if (relFromDist.startsWith("..") || isAbsolute(relFromDist)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }
  // Always re-join from the trusted base using the validated relative segment.
  const safePath = relFromDist === "" ? DIST_DIR : join(DIST_DIR, relFromDist);
  let filePath = safePath;
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST_DIR, "index.html");
    if (!existsSync(filePath)) return false;
  }
  const ext = extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  createReadStream(filePath).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/debug/users") {
      sendJson(
        res,
        200,
        {
          users: listPublicUsers(),
        },
        { "Cache-Control": "no-store" },
      );
      return;
    }
    if (url.pathname.startsWith("/api/auth/")) {
      const webRes = await auth.handler(toWebRequest(req));
      await sendWebResponse(webRes, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      if (serveStatic(req, res)) return;
    }
    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    console.error("[server] unhandled error", err);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

try {
  const { runMigrations } = await getMigrations(authOptions);
  await runMigrations();
} catch (err) {
  console.error("[server] failed to run auth migrations", err);
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`cozycasa server listening on http://localhost:${PORT}`);
});
