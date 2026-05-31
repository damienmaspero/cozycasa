import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolveDatabasePath } from "./db-path.ts";

test("uses an absolute DATABASE_URL as-is", () => {
  const path = resolveDatabasePath(
    { DATABASE_URL: "/var/lib/cozycasa/app.db" },
    "/app",
  );
  assert.equal(path, "/var/lib/cozycasa/app.db");
});

test("resolves a relative DATABASE_URL against cwd", () => {
  const path = resolveDatabasePath({ DATABASE_URL: "./data/app.db" }, "/app");
  assert.equal(path, "/app/data/app.db");
});

test("DATABASE_URL takes precedence over Azure detection", () => {
  const path = resolveDatabasePath(
    {
      DATABASE_URL: "/explicit/app.db",
      WEBSITE_INSTANCE_ID: "instance-123",
      HOME: "/home",
    },
    "/home/site/wwwroot",
  );
  assert.equal(path, "/explicit/app.db");
});

test("on Azure App Service, defaults to the persistent /home volume", () => {
  const path = resolveDatabasePath(
    { WEBSITE_INSTANCE_ID: "instance-123", HOME: "/home" },
    "/home/site/wwwroot",
  );
  assert.equal(path, "/home/data/app.db");
});

test("ignores Azure HOME when not running on App Service", () => {
  const path = resolveDatabasePath({ HOME: "/home" }, "/app");
  assert.equal(path, "/app/data/app.db");
});

test("falls back to ./data/app.db under cwd for local development", () => {
  const path = resolveDatabasePath({}, "/app");
  assert.equal(path, "/app/data/app.db");
});

test("treats a blank DATABASE_URL as unset", () => {
  const path = resolveDatabasePath({ DATABASE_URL: "   " }, "/app");
  assert.equal(path, "/app/data/app.db");
});
