"use client";

import { localeFor, nightWord, personWord, useLanguage } from "./i18n";
import { formatDateLong, parseLocalDate } from "./dates";
import { styles } from "./styles";
import type { Booking } from "./types";

export interface BookingsListProps {
  bookings: Booking[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onConfirm: (id: number) => void;
}

export default function BookingsList({
  bookings,
  onEdit,
  onDelete,
  onConfirm,
}: BookingsListProps) {
  const { lang, t: T } = useLanguage();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = bookings
    .filter((b) => parseLocalDate(b.check_in_date) >= today)
    .sort(
      (a, b) =>
        parseLocalDate(a.check_in_date).getTime() -
        parseLocalDate(b.check_in_date).getTime(),
    )
    .slice(0, 10);

  return (
    <div>
      <h2 style={styles.h2}>{T.upcoming_bookings}</h2>
      {upcoming.length === 0 ? (
        <p style={styles.muted}>{T.no_upcoming_bookings}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map((booking) => {
            const checkIn = parseLocalDate(booking.check_in_date);
            const checkOut = parseLocalDate(booking.check_out_date);
            const nights = Math.floor(
              (checkOut.getTime() - checkIn.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return (
              <div
                key={booking.id}
                style={{
                  ...styles.bookingItem,
                  ...(booking.is_request ? styles.bookingItemRequest : null),
                }}
              >
                <span style={styles.bookingDate}>
                  {formatDateLong(checkIn, localeFor(lang))} →{" "}
                  {formatDateLong(checkOut, localeFor(lang))}
                </span>
                <span style={styles.bookingDate}>
                  ({nights} {nightWord(nights, lang)})
                </span>
                {booking.is_request && (
                  <span style={styles.badge}>
                    <span style={styles.badgeText}>{T.request_badge}</span>
                  </span>
                )}
                <span style={styles.bookingDetails}>
                  <span style={styles.bookingName}>{booking.name}</span>
                  {" — "}
                  {booking.guests} {personWord(booking.guests, lang)}
                </span>
                {!!booking.comment && (
                  <span style={styles.bookingComment}>{booking.comment}</span>
                )}
                <div style={styles.actionsRow}>
                  {booking.is_request && (
                    <button
                      type="button"
                      onClick={() => onConfirm(booking.id)}
                      style={{ ...styles.btn, ...styles.btnConfirm }}
                    >
                      <span style={styles.btnText}>{T.confirm}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(booking.id)}
                    style={styles.btn}
                  >
                    <span style={styles.btnText}>{T.edit}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(booking.id)}
                    style={{ ...styles.btn, ...styles.btnDanger }}
                  >
                    <span style={styles.btnText}>{T.delete}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
