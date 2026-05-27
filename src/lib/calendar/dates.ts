import type { Booking } from "./types";

export function parseLocalDate(dateStr: string): Date {
  const parts = String(dateStr).split("-");
  return new Date(
    parseInt(parts[0]!, 10),
    parseInt(parts[1]!, 10) - 1,
    parseInt(parts[2]!, 10),
  );
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateLong(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getBookingNights(booking: Booking): string[] {
  const nights: string[] = [];
  const checkIn = parseLocalDate(booking.check_in_date);
  const checkOut = parseLocalDate(booking.check_out_date);
  const current = new Date(checkIn);
  while (current < checkOut) {
    nights.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return nights;
}

export const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
