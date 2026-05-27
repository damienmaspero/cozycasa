import { Platform } from "react-native";
import { apiBaseURL, storage } from "@/src/lib/auth-client";
import type { Booking, BookingInput } from "./types";

const TOKEN_KEY = "cozycasa.auth.token";

function bookingsUrl(organizationId: string, id?: number): string {
  const base = Platform.OS === "web" ? "" : (apiBaseURL ?? "");
  const path = id != null ? `/api/bookings/${id}` : "/api/bookings";
  const params = new URLSearchParams({ organizationId });
  return `${base}${path}?${params.toString()}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listBookings(organizationId: string): Promise<Booking[]> {
  const res = await fetch(bookingsUrl(organizationId), {
    credentials: "include",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load bookings: ${res.status}`);
  }
  return (await res.json()) as Booking[];
}

async function sendJson(
  url: string,
  method: string,
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
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

export async function deleteBooking(
  organizationId: string,
  id: number,
): Promise<Response> {
  return fetch(bookingsUrl(organizationId, id), {
    method: "DELETE",
    credentials: "include",
    headers: await authHeaders(),
  });
}
