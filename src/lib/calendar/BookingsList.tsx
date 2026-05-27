import { Pressable, Text, View } from "react-native";
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
    <View>
      <Text style={styles.h2}>{T.upcoming_bookings}</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.muted}>{T.no_upcoming_bookings}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {upcoming.map((booking) => {
            const checkIn = parseLocalDate(booking.check_in_date);
            const checkOut = parseLocalDate(booking.check_out_date);
            const nights = Math.floor(
              (checkOut.getTime() - checkIn.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return (
              <View
                key={booking.id}
                style={[
                  styles.bookingItem,
                  booking.is_request && styles.bookingItemRequest,
                ]}
              >
                <Text style={styles.bookingDate}>
                  {formatDateLong(checkIn, localeFor(lang))} → {formatDateLong(checkOut, localeFor(lang))}
                </Text>
                <Text style={styles.bookingDate}>
                  ({nights} {nightWord(nights, lang)})
                </Text>
                {booking.is_request && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{T.request_badge}</Text>
                  </View>
                )}
                <Text style={styles.bookingDetails}>
                  <Text style={styles.bookingName}>{booking.name}</Text>
                  {" — "}
                  {booking.guests} {personWord(booking.guests, lang)}
                </Text>
                {!!booking.comment && (
                  <Text style={styles.bookingComment}>{booking.comment}</Text>
                )}
                <View style={styles.actionsRow}>
                  {booking.is_request && (
                    <Pressable
                      onPress={() => onConfirm(booking.id)}
                      style={({ pressed }) => [
                        styles.btn,
                        styles.btnConfirm,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.btnText}>{T.confirm}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => onEdit(booking.id)}
                    style={({ pressed }) => [
                      styles.btn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.btnText}>{T.edit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(booking.id)}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnDanger,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.btnText}>{T.delete}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
