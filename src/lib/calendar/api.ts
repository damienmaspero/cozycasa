import type { Booking, BookingInput } from "./types";

function bookingsUrl(organizationId: string, id?: number): string {
  const path = id != null ? `/api/bookings/${id}` : "/api/bookings";
  const params = new URLSearchParams({ organizationId });
  return `${path}?${params.toString()}`;
}

export async function listBookings(organizationId: string): Promise<Booking[]> {
  const res = await fetch(bookingsUrl(organizationId), {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to load bookings: ${res.status}`);
  }
  return (await res.json()) as Booking[];
}

function sendJson(
  url: string,
  method: string,
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function createBooking(
  organizationId: string,
  payload: BookingInput,
): Promise<Response> {
  return sendJson(bookingsUrl(organizationId), "POST", payload);
}

export function updateBooking(
  organizationId: string,
  id: number,
  payload: BookingInput,
): Promise<Response> {
  return sendJson(bookingsUrl(organizationId, id), "PUT", payload);
}

export function deleteBooking(
  organizationId: string,
  id: number,
): Promise<Response> {
  return fetch(bookingsUrl(organizationId, id), {
    method: "DELETE",
    credentials: "include",
  });
}
