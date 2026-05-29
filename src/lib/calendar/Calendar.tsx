"use client";

import { useMemo } from "react";
import { useT } from "./i18n";
import { formatDate, getBookingNights } from "./dates";
import { styles } from "./styles";
import { HOUSE_CAPACITY, type Booking } from "./types";

interface Cell {
  kind: "empty" | "day";
  day?: number;
  date?: Date;
  nextDate?: Date;
}

function buildCells(year: number, month: number): Cell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const cells: Cell[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) cells.push({ kind: "empty" });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const nextDate = new Date(year, month, day + 1);
    cells.push({ kind: "day", day, date, nextDate });
  }
  return cells;
}

export interface CalendarProps {
  currentMonth: Date;
  bookings: Booking[];
  onPrev: () => void;
  onNext: () => void;
  onSelectDate: (dateStr: string) => void;
}

export default function Calendar({
  currentMonth,
  bookings,
  onPrev,
  onNext,
  onSelectDate,
}: CalendarProps) {
  const T = useT();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const cells = useMemo(() => buildCells(year, month), [year, month]);

  const { confirmedByNight, requestsByNight } = useMemo(() => {
    const c = new Map<string, Booking[]>();
    const r = new Map<string, Booking[]>();
    for (const b of bookings) {
      const map = b.is_request ? r : c;
      for (const night of getBookingNights(b)) {
        if (!map.has(night)) map.set(night, []);
        map.get(night)!.push(b);
      }
    }
    return { confirmedByNight: c, requestsByNight: r };
  }, [bookings]);

  const today = new Date();
  const todayStr = today.toDateString();

  return (
    <div>
      <h2 style={styles.h2}>{T.booking_calendar}</h2>
      <div style={styles.calendarControls}>
        <button
          type="button"
          onClick={onPrev}
          style={{ ...styles.btn, ...styles.btnNav }}
        >
          <span style={styles.btnNavText}>{T.previous}</span>
        </button>
        <span style={styles.currentMonth}>{`${T.months[month]} ${year}`}</span>
        <button
          type="button"
          onClick={onNext}
          style={{ ...styles.btn, ...styles.btnNav }}
        >
          <span style={styles.btnNavText}>{T.next}</span>
        </button>
      </div>

      <div style={styles.weekRow}>
        {T.weekdays_short.map((w) => (
          <div key={w} style={styles.weekCell}>
            <span style={styles.weekCellText}>{w}</span>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        {cells.map((cell, idx) => {
          if (cell.kind === "empty") {
            return (
              <div
                key={`e-${idx}`}
                style={{ ...styles.cell, ...styles.cellEmpty, cursor: "default" }}
              />
            );
          }
          const date = cell.date!;
          const dateStr = formatDate(date);
          const confirmed = confirmedByNight.get(dateStr) || [];
          const requests = requestsByNight.get(dateStr) || [];
          const allDay = [...confirmed, ...requests];
          const totalGuests = confirmed.reduce((s, b) => s + b.guests, 0);
          const requestGuests = requests.reduce((s, b) => s + b.guests, 0);

          const isToday = date.toDateString() === todayStr;
          const isPast = date < today && !isToday;
          const isFull = totalGuests >= HOUSE_CAPACITY;
          const isBooked = allDay.length > 0;

          return (
            <button
              type="button"
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              style={{
                ...styles.cell,
                ...(isPast ? styles.cellPast : null),
                ...(isBooked ? styles.cellBooked : null),
                ...(isFull ? styles.cellFull : null),
                ...(isToday ? styles.cellToday : null),
              }}
            >
              <span
                style={{
                  ...styles.dayNumber,
                  ...(isPast ? styles.dayNumberPast : null),
                  display: "block",
                }}
              >
                {cell.day}
              </span>
              {allDay.length > 0 && (
                <div>
                  {allDay.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      style={{
                        ...styles.bookingMini,
                        ...(b.is_request ? styles.bookingMiniRequest : null),
                      }}
                    >
                      <span
                        style={{
                          ...(b.is_request
                            ? styles.bookingMiniRequestText
                            : styles.bookingMiniText),
                          display: "block",
                        }}
                      >
                        {b.name} ({b.guests})
                        {b.is_request ? ` ${T.request_label}` : ""}
                      </span>
                    </div>
                  ))}
                  {allDay.length > 2 && (
                    <div style={styles.bookingMore}>
                      +{allDay.length - 2} {T.others}
                    </div>
                  )}
                  <div style={styles.capacityLine}>
                    {totalGuests}/{HOUSE_CAPACITY} {T.guests_short}
                    {requestGuests > 0
                      ? ` (+${requestGuests} ${T.request_short})`
                      : ""}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
