"use client";

import { useMemo, useState } from "react";
import { nightWord, useLanguage } from "./i18n";
import {
  DATE_INPUT_PATTERN,
  formatDate,
  getBookingNights,
  parseLocalDate,
} from "./dates";
import { styles } from "./styles";
import { HOUSE_CAPACITY, type Booking, type BookingInput } from "./types";
import { notify } from "./dialogs";
import DateField from "./DateField";

export interface BookingModalInitial {
  type: "new" | "edit";
  dateStr: string;
  booking?: Booking | null;
}

export interface BookingModalProps {
  initial: BookingModalInitial;
  bookings: Booking[];
  onSubmit: (payload: BookingInput) => void;
  onClose: () => void;
}

function computeMinCapacity(
  bookings: Booking[],
  checkIn: Date,
  checkOut: Date,
  excludeId: number | null,
): number {
  let minCapacity = HOUSE_CAPACITY;
  const current = new Date(checkIn);
  while (current < checkOut) {
    const dateStr = formatDate(current);
    const total = bookings
      .filter((b) => {
        if (b.is_request) return false;
        if (excludeId != null && b.id === excludeId) return false;
        return getBookingNights(b).includes(dateStr);
      })
      .reduce((s, b) => s + b.guests, 0);
    const remaining = HOUSE_CAPACITY - total;
    if (remaining < minCapacity) minCapacity = remaining;
    current.setDate(current.getDate() + 1);
  }
  return minCapacity;
}

type CapacityInfo =
  | { kind: "invalid"; max: number }
  | { kind: "request"; nights: number; max: number }
  | { kind: "ok"; nights: number; max: number }
  | { kind: "full"; nights: number; max: number };

export default function BookingModal({
  initial,
  bookings,
  onSubmit,
  onClose,
}: BookingModalProps) {
  const { lang, t: T } = useLanguage();
  const isEdit = initial.type === "edit";
  const seed = initial.booking ?? null;

  const seedCheckOut = seed
    ? seed.check_out_date
    : (() => {
        const d = parseLocalDate(initial.dateStr);
        d.setDate(d.getDate() + 1);
        return formatDate(d);
      })();

  const [checkIn, setCheckIn] = useState(seed?.check_in_date ?? initial.dateStr);
  const [checkOut, setCheckOut] = useState(seedCheckOut);
  const [name, setName] = useState(seed?.name ?? "");
  const [guests, setGuests] = useState(seed ? String(seed.guests) : "");
  const [comment, setComment] = useState(seed?.comment ?? "");
  const [isRequest, setIsRequest] = useState(!!seed?.is_request);

  const excludeId = isEdit && seed ? seed.id : null;

  const checkOutMinimumDate = useMemo(() => {
    if (!DATE_INPUT_PATTERN.test(checkIn)) return undefined;
    const d = parseLocalDate(checkIn);
    d.setDate(d.getDate() + 1);
    return d;
  }, [checkIn]);

  const datesValid =
    DATE_INPUT_PATTERN.test(checkIn) && DATE_INPUT_PATTERN.test(checkOut);

  const capacityInfo = useMemo<CapacityInfo>(() => {
    if (!datesValid) return { kind: "invalid", max: 0 };
    const ci = parseLocalDate(checkIn);
    const co = parseLocalDate(checkOut);
    if (co <= ci) return { kind: "invalid", max: 0 };
    const nights = Math.floor(
      (co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (isRequest) return { kind: "request", nights, max: HOUSE_CAPACITY };
    const minCap = computeMinCapacity(bookings, ci, co, excludeId);
    return {
      kind: minCap > 0 ? "ok" : "full",
      nights,
      max: minCap,
    };
  }, [bookings, checkIn, checkOut, isRequest, excludeId, datesValid]);

  function handleSubmit() {
    if (!datesValid) {
      notify(`${T.check_in_date} / ${T.check_out_date}: ${T.date_format_hint}`);
      return;
    }
    if (parseLocalDate(checkOut) <= parseLocalDate(checkIn)) {
      notify(T.check_out_must_be_after);
      return;
    }
    const guestCount = parseInt(guests, 10);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      notify(T.number_of_guests);
      return;
    }
    if (!name.trim()) {
      notify(T.name);
      return;
    }
    onSubmit({
      check_in_date: checkIn,
      check_out_date: checkOut,
      name: name.trim(),
      guests: guestCount,
      is_request: isRequest,
      comment,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={styles.h2}>{isEdit ? T.edit_booking : T.new_booking}</h2>

      <div style={styles.formGroup}>
        <label style={styles.label}>{T.check_in_date}</label>
        <DateField
          value={checkIn}
          onChange={setCheckIn}
          invalid={!DATE_INPUT_PATTERN.test(checkIn)}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>{T.check_out_date}</label>
        <DateField
          value={checkOut}
          onChange={setCheckOut}
          minimumDate={checkOutMinimumDate}
          invalid={!DATE_INPUT_PATTERN.test(checkOut)}
        />
      </div>

      <div style={styles.capacityInfo}>
        {capacityInfo.kind === "invalid" && (
          <span style={styles.error}>{T.check_out_must_be_after}</span>
        )}
        {capacityInfo.kind === "request" && (
          <>
            <span style={styles.bold}>
              {capacityInfo.nights} {nightWord(capacityInfo.nights, lang)}
            </span>
            <span style={styles.info}>
              {T.request_mode_capacity_not_checked}
            </span>
          </>
        )}
        {capacityInfo.kind === "ok" && (
          <>
            <span style={styles.bold}>
              {capacityInfo.nights} {nightWord(capacityInfo.nights, lang)}
            </span>
            <span>
              <span style={styles.bold}>{T.available_spots}:</span>{" "}
              {capacityInfo.max}/{HOUSE_CAPACITY} ({T.minimum_across_all_nights})
            </span>
          </>
        )}
        {capacityInfo.kind === "full" && (
          <>
            <span style={styles.bold}>
              {capacityInfo.nights} {nightWord(capacityInfo.nights, lang)}
            </span>
            <span style={styles.error}>{T.no_spots_available}</span>
          </>
        )}
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>{T.name}</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={T.name_placeholder}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>{T.number_of_guests}</label>
        <input
          style={styles.input}
          value={guests}
          onChange={(e) =>
            setGuests(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
          }
          placeholder={T.guests_placeholder}
          inputMode="numeric"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>{T.comment_optional}</label>
        <textarea
          style={{ ...styles.input, ...styles.textarea }}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={T.comment_placeholder}
          rows={3}
        />
      </div>

      <label style={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isRequest}
          onChange={(e) => setIsRequest(e.target.checked)}
        />
        <span style={styles.label}>{T.save_as_request}</span>
      </label>

      <div style={styles.modalActions}>
        <button
          type="button"
          onClick={onClose}
          style={{ ...styles.btn, ...styles.btnSecondary }}
        >
          <span style={styles.btnText}>{T.cancel}</span>
        </button>
        <button type="button" onClick={handleSubmit} style={styles.btn}>
          <span style={styles.btnText}>{isEdit ? T.update : T.book}</span>
        </button>
      </div>
    </div>
  );
}
