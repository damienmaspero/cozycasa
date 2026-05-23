import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildCorsHeaders } from "./auth-cors.ts";

describe("buildCorsHeaders", () => {
  test("returns null when there is no Origin header", () => {
    const r = buildCorsHeaders({
      origin: null,
      isTrusted: true,
      requestedHeaders: null,
    });
    assert.equal(r, null);
  });

  test("returns null when origin is not trusted", () => {
    const r = buildCorsHeaders({
      origin: "https://evil.example",
      isTrusted: false,
      requestedHeaders: null,
    });
    assert.equal(r, null);
  });

  test("echoes a trusted origin and sets credentials/vary/methods", () => {
    const r = buildCorsHeaders({
      origin: "http://localhost:8081",
      isTrusted: true,
      requestedHeaders: null,
    });
    assert.ok(r);
    assert.equal(r!["Access-Control-Allow-Origin"], "http://localhost:8081");
    assert.equal(r!["Access-Control-Allow-Credentials"], "true");
    assert.equal(r!["Vary"], "Origin");
    assert.equal(r!["Access-Control-Allow-Methods"], "GET, POST, OPTIONS");
  });

  test("falls back to a default Allow-Headers list when none is requested", () => {
    const r = buildCorsHeaders({
      origin: "cozycasa://",
      isTrusted: true,
      requestedHeaders: null,
    });
    assert.ok(r);
    assert.equal(
      r!["Access-Control-Allow-Headers"],
      "Content-Type, Authorization",
    );
  });

  test("echoes the requested headers when present", () => {
    const r = buildCorsHeaders({
      origin: "exp://",
      isTrusted: true,
      requestedHeaders: "x-foo, x-bar, content-type",
    });
    assert.ok(r);
    assert.equal(
      r!["Access-Control-Allow-Headers"],
      "x-foo, x-bar, content-type",
    );
  });

  test("does not emit headers if origin is empty string", () => {
    const r = buildCorsHeaders({
      origin: "",
      isTrusted: true,
      requestedHeaders: null,
    });
    assert.equal(r, null);
  });
});
