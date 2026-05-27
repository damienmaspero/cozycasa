import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { connect } from "node:net";
import { Buffer } from "node:buffer";
import {
  getCanonicalHostRedirect,
  MIME_TYPES,
  sendWebResponse,
  serveStatic,
  toWebRequest,
} from "./server-utils.ts";

// --- serveStatic ---

describe("serveStatic", () => {
  let distDir: string;
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  before(async () => {
    distDir = mkdtempSync(join(tmpdir(), "cozycasa-static-"));
    writeFileSync(join(distDir, "index.html"), "<!doctype html><html>spa</html>");
    writeFileSync(join(distDir, "app.js"), "console.log('hi');");
    writeFileSync(join(distDir, "styles.css"), "body{}");
    writeFileSync(join(distDir, "data.bin"), "binary-blob");
    mkdirSync(join(distDir, "assets"));
    writeFileSync(join(distDir, "assets", "logo.png"), "PNG-bytes");

    server = createServer((req, res) => {
      if (serveStatic(req, res, distDir)) return;
      res.statusCode = 404;
      res.end("Not Found");
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no address");
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(distDir, { recursive: true, force: true });
  });

  test("serves a known file with mapped MIME type", async () => {
    const res = await fetch(`${baseUrl}/app.js`);
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get("content-type"),
      "application/javascript; charset=utf-8",
    );
    assert.equal(await res.text(), "console.log('hi');");
  });

  test("serves CSS with css MIME type", async () => {
    const res = await fetch(`${baseUrl}/styles.css`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/css; charset=utf-8");
  });

  test("serves nested asset with image MIME type", async () => {
    const res = await fetch(`${baseUrl}/assets/logo.png`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.equal(await res.text(), "PNG-bytes");
  });

  test("unknown extension falls back to application/octet-stream", async () => {
    const res = await fetch(`${baseUrl}/data.bin`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/octet-stream");
  });

  test("missing file falls back to index.html (SPA fallback)", async () => {
    const res = await fetch(`${baseUrl}/some/deep/route`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
    assert.match(await res.text(), /spa/);
  });

  test("directory request falls back to index.html", async () => {
    const res = await fetch(`${baseUrl}/assets`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  });

  test("root request serves index.html", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
    assert.match(await res.text(), /spa/);
  });

  test("query string is ignored when resolving the path", async () => {
    const res = await fetch(`${baseUrl}/app.js?v=123`);
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get("content-type"),
      "application/javascript; charset=utf-8",
    );
  });

  test("literal .. segment is rejected with 403", async () => {
    const out = await rawGet(server, "/../etc/passwd");
    assert.equal(out.status, 403);
    assert.match(out.body, /Forbidden/);
  });

  test("percent-encoded .. is rejected with 403", async () => {
    const out = await rawGet(server, "/%2e%2e/secrets");
    assert.equal(out.status, 403);
  });

  test("null byte in URL is rejected with 403", async () => {
    const res = await fetch(`${baseUrl}/app.js%00.png`);
    assert.equal(res.status, 403);
  });

  test("malformed percent-encoding yields 400", async () => {
    const res = await fetch(`${baseUrl}/%E0%A4%A`);
    assert.equal(res.status, 400);
    assert.equal(await res.text(), "Bad Request");
  });

  test("backslash traversal is rejected with 403", async () => {
    const out = await rawGet(server, "/..%5Csecret");
    assert.equal(out.status, 403);
  });
});

// Send a raw GET so the URL path is delivered verbatim (no client-side
// normalization, which `fetch` performs for things like `..` and `%2e%2e`).
async function rawGet(
  server: ReturnType<typeof createServer>,
  path: string,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  return await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const socket = connect(addr.port, "127.0.0.1", () => {
      socket.write(
        `GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`,
      );
    });
    const chunks: Buffer[] = [];
    socket.on("data", (c: Buffer | string) => {
      chunks.push(typeof c === "string" ? Buffer.from(c) : c);
    });
    socket.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      const match = /^HTTP\/1\.1 (\d+)/.exec(text);
      resolve({
        status: match ? Number(match[1]) : 0,
        body: text.split("\r\n\r\n")[1] ?? "",
      });
    });
    socket.on("error", reject);
  });
}

describe("serveStatic without a dist directory", () => {
  test("returns false when distDir does not exist", () => {
    const req = { url: "/anything", method: "GET", headers: {} } as IncomingMessage;
    let ended = false;
    const res = {
      statusCode: 200,
      setHeader() {},
      end() {
        ended = true;
      },
    } as unknown as ServerResponse;
    const handled = serveStatic(req, res, join(tmpdir(), "cozycasa-nope-does-not-exist"));
    assert.equal(handled, false);
    assert.equal(ended, false);
  });

  test("returns false when distDir exists but has no index.html and file missing", () => {
    const empty = mkdtempSync(join(tmpdir(), "cozycasa-empty-"));
    try {
      const req = { url: "/missing", method: "GET", headers: {} } as IncomingMessage;
      let ended = false;
      const res = {
        statusCode: 200,
        setHeader() {},
        end() {
          ended = true;
        },
      } as unknown as ServerResponse;
      const handled = serveStatic(req, res, empty);
      assert.equal(handled, false);
      assert.equal(ended, false);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

// --- MIME_TYPES ---

describe("MIME_TYPES", () => {
  test("covers the standard web bundle extensions", () => {
    for (const ext of [".html", ".js", ".mjs", ".css", ".json", ".map"]) {
      assert.ok(MIME_TYPES[ext], `missing MIME for ${ext}`);
    }
  });

  test("includes charset for text formats", () => {
    assert.match(MIME_TYPES[".html"]!, /charset=utf-8/);
    assert.match(MIME_TYPES[".js"]!, /charset=utf-8/);
    assert.match(MIME_TYPES[".css"]!, /charset=utf-8/);
    assert.match(MIME_TYPES[".json"]!, /charset=utf-8/);
  });

  test("does not include charset for binary formats", () => {
    assert.doesNotMatch(MIME_TYPES[".png"]!, /charset/);
    assert.doesNotMatch(MIME_TYPES[".woff2"]!, /charset/);
  });
});

// --- toWebRequest ---

describe("getCanonicalHostRedirect", () => {
  function makeReq(opts: {
    url?: string;
    headers?: Record<string, string | undefined>;
  }): IncomingMessage {
    const stream: IncomingMessage = Readable.from([]) as unknown as IncomingMessage;
    (stream as unknown as { url?: string }).url = opts.url ?? "/";
    (stream as unknown as { headers: Record<string, unknown> }).headers =
      opts.headers ?? {};
    return stream;
  }

  test("redirects the bare production domain to the www host", () => {
    const req = makeReq({
      url: "/calendar?month=5",
      headers: { host: "thecozycasa.net" },
    });

    assert.equal(
      getCanonicalHostRedirect(req),
      "https://www.thecozycasa.net/calendar?month=5",
    );
  });

  test("redirects bare domain with a port to the canonical https host", () => {
    const req = makeReq({
      url: "/",
      headers: { host: "thecozycasa.net:3000" },
    });

    assert.equal(getCanonicalHostRedirect(req), "https://www.thecozycasa.net/");
  });

  test("does not redirect the canonical www domain", () => {
    const req = makeReq({ headers: { host: "www.thecozycasa.net" } });

    assert.equal(getCanonicalHostRedirect(req), null);
  });

  test("does not redirect unrelated hosts", () => {
    const req = makeReq({ headers: { host: "localhost:3000" } });

    assert.equal(getCanonicalHostRedirect(req), null);
  });
});

describe("toWebRequest", () => {
  function makeReq(opts: {
    url?: string;
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: Buffer;
  }): IncomingMessage {
    const stream: IncomingMessage = Readable.from(
      opts.body ? [opts.body] : [],
    ) as unknown as IncomingMessage;
    (stream as unknown as { url?: string }).url = opts.url ?? "/";
    (stream as unknown as { method?: string }).method = opts.method ?? "GET";
    (stream as unknown as { headers: Record<string, unknown> }).headers =
      opts.headers ?? {};
    return stream;
  }

  test("uses request host when present", () => {
    const req = makeReq({ url: "/foo", headers: { host: "example.test:1234" } });
    const r = toWebRequest(req, 3000);
    assert.equal(new URL(r.url).host, "example.test:1234");
    assert.equal(new URL(r.url).pathname, "/foo");
  });

  test("falls back to defaultPort when no host header", () => {
    const req = makeReq({ url: "/bar" });
    const r = toWebRequest(req, 4242);
    assert.equal(new URL(r.url).host, "localhost:4242");
  });

  test("preserves single-value headers", () => {
    const req = makeReq({ headers: { host: "h", "x-test": "value" } });
    const r = toWebRequest(req, 3000);
    assert.equal(r.headers.get("x-test"), "value");
  });

  test("preserves multi-value headers by appending each value", () => {
    const req = makeReq({
      headers: { host: "h", "set-cookie": ["a=1", "b=2"] },
    });
    const r = toWebRequest(req, 3000);
    // getSetCookie is supported in Node 24 fetch headers.
    const all = r.headers.getSetCookie?.() ?? [];
    assert.deepEqual(all, ["a=1", "b=2"]);
  });

  test("skips undefined header values", () => {
    const req = makeReq({ headers: { host: "h", "x-undef": undefined } });
    const r = toWebRequest(req, 3000);
    assert.equal(r.headers.get("x-undef"), null);
  });

  test("GET requests do not have a body", () => {
    const req = makeReq({ method: "GET", headers: { host: "h" } });
    const r = toWebRequest(req, 3000);
    assert.equal(r.body, null);
  });

  test("HEAD requests do not have a body", () => {
    const req = makeReq({ method: "HEAD", headers: { host: "h" } });
    const r = toWebRequest(req, 3000);
    assert.equal(r.body, null);
  });

  test("POST requests carry the request body", async () => {
    const req = makeReq({
      method: "POST",
      headers: { host: "h", "content-type": "application/json" },
      body: Buffer.from('{"hello":"world"}'),
    });
    const r = toWebRequest(req, 3000);
    assert.equal(r.method, "POST");
    assert.equal(await r.text(), '{"hello":"world"}');
  });

  test("defaults method to GET when missing", () => {
    const req = makeReq({ headers: { host: "h" } });
    (req as unknown as { method?: string }).method = undefined;
    const r = toWebRequest(req, 3000);
    assert.equal(r.method, "GET");
  });
});

// --- sendWebResponse ---

describe("sendWebResponse", () => {
  test("copies status, headers, and body to ServerResponse", async () => {
    const headersSet: Record<string, string> = {};
    let statusCode = 0;
    const chunks: Uint8Array[] = [];
    let ended = false;
    const fakeRes = {
      set statusCode(v: number) {
        statusCode = v;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(name: string, value: string) {
        headersSet[name.toLowerCase()] = value;
      },
      write(c: Uint8Array) {
        chunks.push(c);
      },
      end() {
        ended = true;
      },
    } as unknown as ServerResponse;

    const webRes = new Response("hello world", {
      status: 201,
      headers: { "content-type": "text/plain", "x-custom": "v" },
    });
    await sendWebResponse(webRes, fakeRes);

    assert.equal(statusCode, 201);
    assert.equal(headersSet["content-type"], "text/plain");
    assert.equal(headersSet["x-custom"], "v");
    const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
    assert.equal(body, "hello world");
    assert.equal(ended, true);
  });

  test("handles empty body responses", async () => {
    let statusCode = 0;
    let ended = false;
    const fakeRes = {
      set statusCode(v: number) {
        statusCode = v;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader() {},
      write() {
        throw new Error("should not be called for empty body");
      },
      end() {
        ended = true;
      },
    } as unknown as ServerResponse;

    const webRes = new Response(null, { status: 204 });
    await sendWebResponse(webRes, fakeRes);
    assert.equal(statusCode, 204);
    assert.equal(ended, true);
  });
});
