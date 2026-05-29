import { handleBookings } from "@/src/bookings-handler.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleBookings(request);
}

export function POST(request: Request): Promise<Response> {
  return handleBookings(request);
}
