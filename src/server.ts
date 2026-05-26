import { createServer } from "node:http";
import { resolve } from "node:path";
import { getMigrations } from "better-auth/db/migration";
import { auth, authOptions } from "./auth.ts";
import { readBootstrapStatus } from "./bootstrap-status.ts";
import { db } from "./db.ts";
import { sendWebResponse, serveStatic, toWebRequest } from "./server-utils.ts";

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = resolve(process.cwd(), "dist");

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/bootstrap-status") {
      res.statusCode = 200;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readBootstrapStatus(db)));
      return;
    }
    if (url.pathname.startsWith("/api/auth/")) {
      const webRes = await auth.handler(toWebRequest(req, PORT));
      await sendWebResponse(webRes, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      if (serveStatic(req, res, DIST_DIR)) return;
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
