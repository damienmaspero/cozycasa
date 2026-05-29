import { handleBookings } from "@/src/bookings-handler.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function PUT(request: Request): Promise<Response> {
  return handleBookings(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleBookings(request);
}
