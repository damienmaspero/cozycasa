import { Pressable, ScrollView, Text, View } from "react-native";
import { T, nightWord, personWord } from "./i18n";
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
  const date = parseLocalDate(dateStr);
  const confirmed = dayBookings.filter((b) => !b.is_request);
  const requests = dayBookings.filter((b) => b.is_request);
  const totalGuests = confirmed.reduce((s, b) => s + b.guests, 0);
  const requestGuests = requests.reduce((s, b) => s + b.guests, 0);
  const remaining = HOUSE_CAPACITY - totalGuests;

  return (
    <ScrollView
      contentContainerStyle={{ gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h2}>
        {T.bookings_for_night_of} {formatDateLong(date)}
      </Text>

      <View style={styles.capacityInfo}>
        <Text>
          <Text style={styles.bold}>{T.capacity}:</Text> {totalGuests}/
          {HOUSE_CAPACITY} {T.people} ({remaining} {T.spots_remaining})
        </Text>
        {requestGuests > 0 && (
          <Text>
            <Text style={styles.bold}>{T.requests}:</Text> {requestGuests}{" "}
            {T.persons_requesting}
          </Text>
        )}
      </View>

      <Text style={styles.h3}>{T.bookings}</Text>
      <View style={{ gap: 8 }}>
        {dayBookings.map((booking) => {
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
              <Text style={styles.bookingDetails}>
                <Text style={styles.bookingName}>{booking.name}</Text>
                {" — "}
                {booking.guests} {personWord(booking.guests)}
              </Text>
              {booking.is_request && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{T.request_badge}</Text>
                </View>
              )}
              <Text style={styles.bookingDate}>
                {T.from} {formatDateLong(checkIn)} {T.to}{" "}
                {formatDateLong(checkOut)} ({nights} {nightWord(nights)})
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

      <View style={styles.modalActions}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>{T.cancel}</Text>
        </Pressable>
        {remaining > 0 && (
          <Pressable
            onPress={() => onAdd(dateStr)}
            style={({ pressed }) => [
              styles.btn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>{T.add_booking}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
