import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import BookingModal from "./BookingModal";
import Calendar from "./Calendar";
import DayDetailsModal from "./DayDetailsModal";
import { useBookings } from "./useBookings";
import { formatDate, parseLocalDate } from "./dates";
import { translateServerError, useLanguage } from "./i18n";
import { styles } from "./styles";
import { ask, notify } from "./dialogs";
import type { Booking, BookingInput } from "./types";

type ModalState =
  | null
  | { type: "new"; dateStr: string }
  | { type: "edit"; dateStr: string; booking: Booking }
  | { type: "day"; dateStr: string; bookings: Booking[] };

export interface CalendarScreenProps {
  organizationId: string;
}

export default function CalendarScreen({ organizationId }: CalendarScreenProps) {
  const { lang, t: T } = useLanguage();
  const { bookings, save, remove, confirm } = useBookings(organizationId);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const openNewBooking = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let defaultDate: Date;
    if (today.getFullYear() === year && today.getMonth() === month) {
      defaultDate = today;
    } else {
      defaultDate = new Date(year, month, 1);
    }
    if (defaultDate < today) defaultDate = today;
    setModal({ type: "new", dateStr: formatDate(defaultDate) });
  }, [currentMonth]);

  function selectDate(dateStr: string) {
    const date = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      notify(T.cannot_book_past_date);
      return;
    }
    const dayBookings = bookings.filter((b) => {
      const ci = parseLocalDate(b.check_in_date);
      const co = parseLocalDate(b.check_out_date);
      return ci <= date && date < co;
    });
    if (dayBookings.length > 0) {
      setModal({ type: "day", dateStr, bookings: dayBookings });
    } else {
      setModal({ type: "new", dateStr });
    }
  }

  function startEdit(id: number) {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) {
      notify(T.booking_not_found);
      return;
    }
    setModal({ type: "edit", dateStr: booking.check_in_date, booking });
  }

  async function handleSave(payload: BookingInput) {
    const id =
      modal && modal.type === "edit" && modal.booking ? modal.booking.id : null;
    const successMsg = id ? T.booking_updated_success : T.booking_created_success;
    const result = await save(id, payload);
    if (result.ok) {
      closeModal();
      notify(successMsg);
    } else {
      notify(translateServerError(result.errorKey, lang));
    }
  }

  async function handleDelete(id: number) {
    if (!(await ask(T.confirm_delete_booking))) return;
    closeModal();
    const result = await remove(id);
    notify(result.ok ? T.booking_deleted_success : T.error_deleting_booking);
  }

  async function handleConfirm(id: number) {
    if (!(await ask(T.confirm_this_booking))) return;
    closeModal();
    const result = await confirm(id);
    notify(
      result.ok
        ? T.booking_confirmed_success
        : translateServerError(result.errorKey, lang),
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Calendar
          currentMonth={currentMonth}
          bookings={bookings}
          onPrev={() =>
            setCurrentMonth(
              (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
            )
          }
          onNext={() =>
            setCurrentMonth(
              (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
            )
          }
          onSelectDate={selectDate}
        />

        <View style={{ height: 80 }} />
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.btnPressed]}
        onPress={openNewBooking}
        accessibilityLabel={T.add_booking}
      >
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>{T.book_cta}</Text>
      </Pressable>

      <Modal
        visible={!!modal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {modal?.type === "day" && (
              <DayDetailsModal
                dateStr={modal.dateStr}
                dayBookings={modal.bookings}
                onClose={closeModal}
                onAdd={(d) => setModal({ type: "new", dateStr: d })}
                onEdit={startEdit}
                onDelete={handleDelete}
                onConfirm={handleConfirm}
              />
            )}
            {(modal?.type === "new" || modal?.type === "edit") && (
              <BookingModal
                initial={modal}
                bookings={bookings}
                onSubmit={handleSave}
                onClose={closeModal}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
