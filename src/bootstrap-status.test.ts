import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readBootstrapStatus } from "./bootstrap-status.ts";

describe("readBootstrapStatus", () => {
  test("allows first-account sign-up when the user table is empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "cozycasa-bootstrap-status-"));
    try {
      const db = new DatabaseSync(join(dir, "app.db"));
      db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY)');
      assert.deepEqual(readBootstrapStatus(db), { signUpAllowed: true });
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("closes first-account sign-up once a user exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "cozycasa-bootstrap-status-"));
    try {
      const db = new DatabaseSync(join(dir, "app.db"));
      db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY)');
      db.exec("INSERT INTO \"user\" (id) VALUES ('admin')");
      assert.deepEqual(readBootstrapStatus(db), { signUpAllowed: false });
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
