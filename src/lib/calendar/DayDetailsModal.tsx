"use client";

import { localeFor, nightWord, personWord, useLanguage } from "./i18n";
import { formatDateLong, parseLocalDate } from "./dates";
import { styles } from "./styles";
import { HOUSE_CAPACITY, type Booking } from "./types";

export interface DayDetailsModalProps {
  dateStr: string;
  dayBookings: Booking[];
  onClose: () => void;
  onAdd: (dateStr: string) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onConfirm: (id: number) => void;
}

export default function DayDetailsModal({
  dateStr,
  dayBookings,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
}: DayDetailsModalProps) {
  const { lang, t: T } = useLanguage();
  const date = parseLocalDate(dateStr);
  const confirmed = dayBookings.filter((b) => !b.is_request);
  const requests = dayBookings.filter((b) => b.is_request);
  const totalGuests = confirmed.reduce((s, b) => s + b.guests, 0);
  const requestGuests = requests.reduce((s, b) => s + b.guests, 0);
  const remaining = HOUSE_CAPACITY - totalGuests;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={styles.h2}>
        {T.bookings_for_night_of} {formatDateLong(date, localeFor(lang))}
      </h2>

      <div style={styles.capacityInfo}>
        <span>
          <span style={styles.bold}>{T.capacity}:</span> {totalGuests}/
          {HOUSE_CAPACITY} {T.people} ({remaining} {T.spots_remaining})
        </span>
        {requestGuests > 0 && (
          <span>
            <span style={styles.bold}>{T.requests}:</span> {requestGuests}{" "}
            {T.persons_requesting}
          </span>
        )}
      </div>

      <h3 style={styles.h3}>{T.bookings}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dayBookings.map((booking) => {
          const checkIn = parseLocalDate(booking.check_in_date);
          const checkOut = parseLocalDate(booking.check_out_date);
          const nights = Math.floor(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
          );
          return (
            <div
              key={booking.id}
              style={{
                ...styles.bookingItem,
                ...(booking.is_request ? styles.bookingItemRequest : null),
              }}
            >
              <span style={styles.bookingDetails}>
                <span style={styles.bookingName}>{booking.name}</span>
                {" — "}
                {booking.guests} {personWord(booking.guests, lang)}
              </span>
              {booking.is_request && (
                <span style={styles.badge}>
                  <span style={styles.badgeText}>{T.request_badge}</span>
                </span>
              )}
              <span style={styles.bookingDate}>
                {T.from} {formatDateLong(checkIn, localeFor(lang))} {T.to}{" "}
                {formatDateLong(checkOut, localeFor(lang))} ({nights}{" "}
                {nightWord(nights, lang)})
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

      <div style={styles.modalActions}>
        <button
          type="button"
          onClick={onClose}
          style={{ ...styles.btn, ...styles.btnSecondary }}
        >
          <span style={styles.btnText}>{T.cancel}</span>
        </button>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => onAdd(dateStr)}
            style={styles.btn}
          >
            <span style={styles.btnText}>{T.add_booking}</span>
          </button>
        )}
      </div>
    </div>
  );
}
