export const HOUSE_CAPACITY = 15;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(dateStr: string): Date | null {
  if (!DATE_RE.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10)) as [
    number,
    number,
    number,
  ];
  const ts = Date.UTC(y, m - 1, d);
  const date = new Date(ts);
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function nightsOf(
  checkIn: string | Date,
  checkOut: string | Date,
): string[] {
  const start = typeof checkIn === "string" ? parseDate(checkIn) : checkIn;
  const end = typeof checkOut === "string" ? parseDate(checkOut) : checkOut;
  if (!start || !end || end <= start) return [];
  const nights: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor < end) {
    nights.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

export interface BookingForCapacity {
  check_in_date: string;
  check_out_date: string;
  guests: number;
  is_request: boolean;
}

export function minRemainingCapacity(
  existingBookings: BookingForCapacity[],
  checkIn: string | Date,
  checkOut: string | Date,
): number {
  const nights = nightsOf(checkIn, checkOut);
  if (nights.length === 0) return HOUSE_CAPACITY;
  let maxOccupied = 0;
  for (const night of nights) {
    let occupied = 0;
    for (const b of existingBookings) {
      if (b.is_request) continue;
      if (b.check_in_date <= night && night < b.check_out_date) {
        occupied += b.guests;
      }
    }
    if (occupied > maxOccupied) maxOccupied = occupied;
  }
  return HOUSE_CAPACITY - maxOccupied;
}

export interface BookingInput {
  name: string;
  guests: number;
  check_in_date: string;
  check_out_date: string;
  comment: string;
  is_request: boolean;
}

export type ValidationResult =
  | { ok: true; value: BookingInput }
  | { ok: false; error: string };

export function validateBookingInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "error_saving_booking" };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (name.length === 0 || name.length > 80) {
    return { ok: false, error: "error_saving_booking" };
  }

  const guests = Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > HOUSE_CAPACITY) {
    return { ok: false, error: "error_saving_booking" };
  }

  const checkIn = typeof b.check_in_date === "string" ? b.check_in_date : "";
  const checkOut = typeof b.check_out_date === "string" ? b.check_out_date : "";
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  if (!start || !end) {
    return { ok: false, error: "error_saving_booking" };
  }
  if (end <= start) {
    return { ok: false, error: "check_out_must_be_after" };
  }

  const comment =
    typeof b.comment === "string" ? b.comment.slice(0, 500) : "";

  const isRequest = Boolean(b.is_request);

  return {
    ok: true,
    value: {
      name,
      guests,
      check_in_date: checkIn,
      check_out_date: checkOut,
      comment,
      is_request: isRequest,
    },
  };
}
