import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
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
  onSelectDate: (dateStr: string) => void;
}

export default function Calendar({
  currentMonth,
  bookings,
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
    <View>
      <View style={styles.weekRow}>
        {T.weekdays_short.map((w) => (
          <View key={w} style={styles.weekCell}>
            <Text style={styles.weekCellText}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (cell.kind === "empty") {
            return (
              <View
                key={`e-${idx}`}
                style={[styles.cell, styles.cellEmpty]}
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
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              style={({ pressed }) => [
                styles.cell,
                isPast && styles.cellPast,
                isBooked && styles.cellBooked,
                isFull && styles.cellFull,
                isToday && styles.cellToday,
                pressed && styles.btnPressed,
              ]}
            >
              <Text
                style={[styles.dayNumber, isPast && styles.dayNumberPast]}
              >
                {cell.day}
              </Text>
              {allDay.length > 0 && (
                <View>
                  {allDay.slice(0, 2).map((b) => (
                    <View
                      key={b.id}
                      style={[
                        styles.bookingMini,
                        b.is_request && styles.bookingMiniRequest,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={
                          b.is_request
                            ? styles.bookingMiniRequestText
                            : styles.bookingMiniText
                        }
                      >
                        {b.name} ({b.guests})
                        {b.is_request ? ` ${T.request_label}` : ""}
                      </Text>
                    </View>
                  ))}
                  {allDay.length > 2 && (
                    <Text style={styles.bookingMore}>+</Text>
                  )}
                  <Text style={styles.capacityLine}>
                    {totalGuests}/{HOUSE_CAPACITY} {T.guests_short}
                    {requestGuests > 0
                      ? ` (+${requestGuests} ${T.request_short})`
                      : ""}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
