import { readBootstrapStatus } from "@/src/bootstrap-status.ts";
import { db } from "@/src/db.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(JSON.stringify(readBootstrapStatus(db)), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
