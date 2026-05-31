import { isAbsolute, resolve } from "node:path";

/**
 * Resolve the on-disk location of the SQLite database.
 *
 * Resolution order:
 * 1. An explicit `DATABASE_URL` — used as-is when absolute, otherwise resolved
 *    against `cwd`. This is the escape hatch for any environment (local, CI,
 *    custom hosting) that wants to pin the path.
 * 2. On Azure App Service, the persistent `/home` volume. The deployment
 *    replaces `wwwroot` (the process `cwd`) on every deploy, so a database
 *    stored under `cwd` is wiped each time — taking every user and booking with
 *    it and forcing the app back into first-run bootstrap. `/home` survives
 *    deploys and restarts, so the DB lives there instead. Azure is detected via
 *    `WEBSITE_INSTANCE_ID` (always set on App Service) and the `HOME` volume.
 * 3. `./data/app.db` under `cwd` for local development.
 */
export function resolveDatabasePath(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string {
  const explicit = env.DATABASE_URL?.trim();
  if (explicit) {
    return isAbsolute(explicit) ? explicit : resolve(cwd, explicit);
  }

  const azureHome = env.WEBSITE_INSTANCE_ID ? env.HOME?.trim() : undefined;
  if (azureHome) {
    return resolve(azureHome, "data/app.db");
  }

  return resolve(cwd, "./data/app.db");
}
