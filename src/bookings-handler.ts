import { auth } from "./auth.ts";
import { db } from "./db.ts";
import {
  validateBookingInput,
  minRemainingCapacity,
  parseDate,
  todayUtc,
} from "./capacity.ts";
import * as bookingsDb from "./bookings-db.ts";

const JSON_BODY_LIMIT_BYTES = 16 * 1024;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readJSONBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length === 0) {
    throw new Error("Request body cannot be empty");
  }
  if (Buffer.byteLength(text, "utf8") > JSON_BODY_LIMIT_BYTES) {
    throw new Error("Request body too large");
  }
  return JSON.parse(text) as unknown;
}

// Returns the organizationId from the `organizationId` query param when the
// caller is a member of that org; otherwise an error. Membership is verified
// against better-auth's `member` table directly (created by the organization
// plugin) so we never expose another household's data.
async function resolveOrganizationId(
  url: URL,
  headers: Headers,
): Promise<{ ok: true; organizationId: string } | { ok: false; status: number; message: string }> {
  const requested = url.searchParams.get("organizationId");
  if (!requested) {
    return { ok: false, status: 400, message: "organizationId query parameter is required" };
  }
  const session = await auth.api.getSession({ headers });
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, status: 401, message: "Authentication required" };
  }
  const row = db
    .prepare(
      'SELECT 1 AS x FROM "member" WHERE "userId" = ? AND "organizationId" = ? LIMIT 1',
    )
    .get(userId, requested) as { x?: number } | undefined;
  if (!row) {
    return { ok: false, status: 403, message: "Not a member of that organization" };
  }
  return { ok: true, organizationId: requested };
}

export async function handleBookings(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const headers = req.headers;
  const orgResolution = await resolveOrganizationId(url, headers);
  if (!orgResolution.ok) {
    return jsonResponse(orgResolution.status, { error: orgResolution.message });
  }
  const organizationId = orgResolution.organizationId;

  // Collection routes: /api/bookings
  const collectionMatch = url.pathname === "/api/bookings";
  // Item route: /api/bookings/:id
  const itemMatch = url.pathname.match(/^\/api\/bookings\/(\d+)$/);

  if (collectionMatch && req.method === "GET") {
    return jsonResponse(200, bookingsDb.listBookings(db, organizationId));
  }

  if (collectionMatch && req.method === "POST") {
    let body: unknown;
    try {
      body = await readJSONBody(req);
    } catch {
      return jsonResponse(400, { error: "error_saving_booking" });
    }
    const result = validateBookingInput(body);
    if (!result.ok) {
      return jsonResponse(400, { error: result.error });
    }
    const data = result.value;

    const checkIn = parseDate(data.check_in_date);
    if (!checkIn || checkIn < todayUtc()) {
      return jsonResponse(400, { error: "cannot_book_past_date" });
    }

    if (!data.is_request) {
      const candidates = bookingsDb.listOverlappingConfirmed(
        db,
        organizationId,
        data.check_in_date,
        data.check_out_date,
      );
      const remaining = minRemainingCapacity(
        candidates,
        data.check_in_date,
        data.check_out_date,
      );
      if (data.guests > remaining) {
        return jsonResponse(400, { error: "no_spots_available" });
      }
    }

    const created = bookingsDb.createBooking(db, organizationId, data);
    return jsonResponse(201, created);
  }

  if (itemMatch && (req.method === "PUT" || req.method === "DELETE")) {
    const id = parseInt(itemMatch[1]!, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonResponse(404, { error: "booking_not_found" });
    }

    if (req.method === "DELETE") {
      const ok = bookingsDb.deleteBooking(db, organizationId, id);
      if (!ok) return jsonResponse(404, { error: "booking_not_found" });
      return jsonResponse(200, { ok: true });
    }

    // PUT
    const existing = bookingsDb.getBooking(db, organizationId, id);
    if (!existing) {
      return jsonResponse(404, { error: "booking_not_found" });
    }
    let body: unknown;
    try {
      body = await readJSONBody(req);
    } catch {
      return jsonResponse(400, { error: "error_saving_booking" });
    }
    const result = validateBookingInput(body);
    if (!result.ok) {
      return jsonResponse(400, { error: result.error });
    }
    const data = result.value;

    if (!data.is_request) {
      const candidates = bookingsDb.listOverlappingConfirmed(
        db,
        organizationId,
        data.check_in_date,
        data.check_out_date,
        id,
      );
      const remaining = minRemainingCapacity(
        candidates,
        data.check_in_date,
        data.check_out_date,
      );
      if (data.guests > remaining) {
        return jsonResponse(400, { error: "no_spots_available" });
      }
    }

    const updated = bookingsDb.updateBooking(db, organizationId, id, data);
    if (!updated) {
      return jsonResponse(404, { error: "booking_not_found" });
    }
    return jsonResponse(200, updated);
  }

  return jsonResponse(404, { error: "Not Found" });
}
