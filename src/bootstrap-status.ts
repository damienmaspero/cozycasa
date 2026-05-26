import type { DatabaseSync } from "node:sqlite";
import { isSignUpAllowedForUserCount } from "./auth-signup-gate.ts";

export type BootstrapStatus = {
  signUpAllowed: boolean;
};

export function readBootstrapStatus(db: DatabaseSync): BootstrapStatus {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM "user"')
    .get() as { count?: number | bigint } | undefined;
  const userCount = Number(row?.count ?? 0);
  return { signUpAllowed: isSignUpAllowedForUserCount(userCount) };
}
