import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NATIVE_API_BASE_URL,
  normalizeApiBaseURL,
  resolveApiBaseURL,
} from "./api-base-url.ts";

describe("normalizeApiBaseURL", () => {
  test("trims whitespace and trailing slashes", () => {
    assert.equal(
      normalizeApiBaseURL(" https://api.example.test/// "),
      "https://api.example.test",
    );
  });
});

describe("resolveApiBaseURL", () => {
  test("uses the current origin on web", () => {
    assert.equal(
      resolveApiBaseURL({
        envApiURL: "https://api.example.test",
        platformOS: "web",
        webOrigin: "https://app.example.test",
      }),
      "https://app.example.test",
    );
  });

  test("uses the configured native API URL when provided", () => {
    assert.equal(
      resolveApiBaseURL({
        envApiURL: " http://10.0.2.2:3000/ ",
        platformOS: "android",
        webOrigin: undefined,
      }),
      "http://10.0.2.2:3000",
    );
  });

  test("falls back to the production API URL on native when unset", () => {
    assert.equal(
      resolveApiBaseURL({
        envApiURL: undefined,
        platformOS: "android",
        webOrigin: undefined,
      }),
      DEFAULT_NATIVE_API_BASE_URL,
    );
  });
});
