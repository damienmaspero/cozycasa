import type { DatabaseSync } from "node:sqlite";
import type { BookingInput } from "./capacity.ts";

export interface BookingRow {
  id: number;
  organization_id: string;
  name: string;
  guests: number;
  check_in_date: string;
  check_out_date: string;
  comment: string | null;
  is_request: number;
  created_at: string;
}

export interface Booking {
  id: number;
  organization_id: string;
  name: string;
  guests: number;
  check_in_date: string;
  check_out_date: string;
  comment: string;
  is_request: boolean;
  created_at: string;
}

function rowToBooking(row: BookingRow): Booking;
function rowToBooking(row: BookingRow | undefined | null): Booking | null;
function rowToBooking(row: BookingRow | undefined | null): Booking | null {
  if (!row) return null;
  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    guests: row.guests,
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    comment: row.comment ?? "",
    is_request: row.is_request === 1,
    created_at: row.created_at,
  };
}

const COLUMNS =
  "id, organization_id, name, guests, check_in_date, check_out_date, comment, is_request, created_at";

export function runBookingsMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id TEXT    NOT NULL,
      name            TEXT    NOT NULL,
      guests          INTEGER NOT NULL CHECK (guests BETWEEN 1 AND 15),
      check_in_date   TEXT    NOT NULL,
      check_out_date  TEXT    NOT NULL,
      comment         TEXT    NOT NULL DEFAULT '',
      is_request      INTEGER NOT NULL DEFAULT 0 CHECK (is_request IN (0, 1)),
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
      CHECK (date(check_out_date) > date(check_in_date))
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_org_dates
      ON bookings(organization_id, check_in_date, check_out_date);
  `);
}

export function listBookings(
  db: DatabaseSync,
  organizationId: string,
): Booking[] {
  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM bookings WHERE organization_id = ? ORDER BY check_in_date ASC, id ASC`,
    )
    .all(organizationId) as unknown as BookingRow[];
  return rows.map((r) => rowToBooking(r));
}

export function getBooking(
  db: DatabaseSync,
  organizationId: string,
  id: number,
): Booking | null {
  const row = db
    .prepare(
      `SELECT ${COLUMNS} FROM bookings WHERE organization_id = ? AND id = ?`,
    )
    .get(organizationId, id) as BookingRow | undefined;
  return rowToBooking(row);
}

export function listOverlappingConfirmed(
  db: DatabaseSync,
  organizationId: string,
  checkIn: string,
  checkOut: string,
  excludeId: number | null = null,
): Booking[] {
  let sql =
    `SELECT ${COLUMNS} FROM bookings WHERE organization_id = ? AND is_request = 0 ` +
    "AND check_in_date < ? AND check_out_date > ?";
  const params: Array<string | number> = [organizationId, checkOut, checkIn];
  if (excludeId != null) {
    sql += " AND id != ?";
    params.push(excludeId);
  }
  const rows = db.prepare(sql).all(...params) as unknown as BookingRow[];
  return rows.map((r) => rowToBooking(r));
}

export function createBooking(
  db: DatabaseSync,
  organizationId: string,
  data: BookingInput,
): Booking | null {
  const stmt = db.prepare(`
    INSERT INTO bookings (organization_id, name, guests, check_in_date, check_out_date, comment, is_request)
    VALUES (@organization_id, @name, @guests, @check_in_date, @check_out_date, @comment, @is_request)
  `);
  const info = stmt.run({
    organization_id: organizationId,
    name: data.name,
    guests: data.guests,
    check_in_date: data.check_in_date,
    check_out_date: data.check_out_date,
    comment: data.comment || "",
    is_request: data.is_request ? 1 : 0,
  });
  return getBooking(db, organizationId, Number(info.lastInsertRowid));
}

export function updateBooking(
  db: DatabaseSync,
  organizationId: string,
  id: number,
  data: BookingInput,
): Booking | null {
  const stmt = db.prepare(`
    UPDATE bookings
       SET name = @name,
           guests = @guests,
           check_in_date = @check_in_date,
           check_out_date = @check_out_date,
           comment = @comment,
           is_request = @is_request
     WHERE organization_id = @organization_id AND id = @id
  `);
  const info = stmt.run({
    organization_id: organizationId,
    id,
    name: data.name,
    guests: data.guests,
    check_in_date: data.check_in_date,
    check_out_date: data.check_out_date,
    comment: data.comment || "",
    is_request: data.is_request ? 1 : 0,
  });
  if (Number(info.changes) === 0) return null;
  return getBooking(db, organizationId, id);
}

export function deleteBooking(
  db: DatabaseSync,
  organizationId: string,
  id: number,
): boolean {
  const info = db
    .prepare("DELETE FROM bookings WHERE organization_id = ? AND id = ?")
    .run(organizationId, id);
  return Number(info.changes) > 0;
}
