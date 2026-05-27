import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import type { Booking, BookingInput } from "./types";

export interface SaveResult {
  ok: boolean;
  errorKey?: string;
}

export function useBookings(organizationId: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await api.listBookings(organizationId);
      setBookings(list);
      setLoaded(true);
    } catch (err) {
      console.error("Error loading bookings:", err);
    }
  }, [organizationId]);

  useEffect(() => {
    setLoaded(false);
    setBookings([]);
    void reload();
  }, [reload]);

  const save = useCallback(
    async (
      id: number | null,
      payload: BookingInput,
    ): Promise<SaveResult> => {
      if (!organizationId) return { ok: false };
      const res = id
        ? await api.updateBooking(organizationId, id, payload)
        : await api.createBooking(organizationId, payload);
      if (res.ok) {
        await reload();
        return { ok: true };
      }
      let body: { error?: unknown } = {};
      try {
        body = (await res.json()) as { error?: unknown };
      } catch {
        // ignore
      }
      return {
        ok: false,
        errorKey: typeof body.error === "string" ? body.error : undefined,
      };
    },
    [organizationId, reload],
  );

  const remove = useCallback(
    async (id: number): Promise<SaveResult> => {
      if (!organizationId) return { ok: false };
      const res = await api.deleteBooking(organizationId, id);
      if (res.ok) {
        await reload();
        return { ok: true };
      }
      return { ok: false };
    },
    [organizationId, reload],
  );

  const confirm = useCallback(
    async (id: number): Promise<SaveResult> => {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) return { ok: false, errorKey: "booking_not_found" };
      return save(id, {
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        name: booking.name,
        guests: booking.guests,
        is_request: false,
        comment: booking.comment || "",
      });
    },
    [bookings, save],
  );

  return { bookings, loaded, reload, save, remove, confirm };
}
