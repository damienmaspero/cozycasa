import { useCallback, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import BookingModal from "./BookingModal";
import BookingsList from "./BookingsList";
import { useBookings } from "./useBookings";
import { translateServerError, useLanguage } from "./i18n";
import { styles } from "./styles";
import { ask, notify } from "./dialogs";
import type { Booking, BookingInput } from "./types";

type ModalState =
  | null
  | { type: "edit"; dateStr: string; booking: Booking };

export interface UpcomingBookingsScreenProps {
  organizationId: string;
}

export default function UpcomingBookingsScreen({
  organizationId,
}: UpcomingBookingsScreenProps) {
  const { lang, t: T } = useLanguage();
  const { bookings, save, remove, confirm } = useBookings(organizationId);

  const [modal, setModal] = useState<ModalState>(null);
  const closeModal = useCallback(() => setModal(null), []);

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
    const successMsg = id
      ? T.booking_updated_success
      : T.booking_created_success;
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
        <BookingsList
          bookings={bookings}
          onEdit={startEdit}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
        />
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal
        visible={!!modal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {modal?.type === "edit" && (
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
