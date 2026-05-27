// English string table for the calendar UI. The old app was bilingual
// (FR/EN) via a server-rendered dictionary; here we keep things simple and
// inline. Adding i18n later is just a matter of swapping this for a context
// that selects between dictionaries.

export const T = {
  app_title: "Family House",
  booking_calendar: "Booking calendar",
  previous: "‹ Previous",
  next: "Next ›",
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  weekdays_short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  guests_short: "guests",
  request_short: "request",
  request_label: "request",
  request_badge: "REQUEST",
  others: "other(s)",
  upcoming_bookings: "Upcoming bookings",
  no_upcoming_bookings: "No upcoming bookings",
  bookings_for_night_of: "Bookings for the night of",
  add_booking: "Add a booking",
  book_cta: "Book",
  new_booking: "New booking",
  edit_booking: "Edit booking",
  book: "Book",
  update: "Update",
  cancel: "Cancel",
  edit: "Edit",
  delete: "Delete",
  confirm: "Confirm",
  bookings: "Bookings",
  capacity: "Capacity",
  people: "people",
  spots_remaining: "spot(s) remaining",
  requests: "Requests",
  persons_requesting: "person(s) requesting",
  from: "From",
  to: "to",
  check_in_date: "Check-in date",
  check_out_date: "Check-out date",
  name: "Name",
  name_placeholder: "Your name",
  number_of_guests: "Number of guests",
  guests_placeholder: "e.g. 4",
  comment_optional: "Comment (optional)",
  comment_placeholder: "Add a comment...",
  save_as_request: "Save as request (does not count toward capacity)",
  available_spots: "Available spots",
  minimum_across_all_nights: "minimum across all nights",
  request_mode_capacity_not_checked:
    "Request mode: capacity is not checked",
  no_spots_available: "No spots available for this period",
  check_out_must_be_after: "Check-out date must be after check-in date",
  cannot_book_past_date: "Cannot book a past date",
  booking_not_found: "Booking not found",
  booking_created_success: "Booking created successfully!",
  booking_updated_success: "Booking updated successfully!",
  booking_deleted_success: "Booking deleted successfully",
  booking_confirmed_success: "Booking confirmed successfully!",
  confirm_delete_booking: "Are you sure you want to delete this booking?",
  confirm_this_booking: "Confirm this booking?",
  error_saving_booking: "Error saving booking",
  error_deleting_booking: "Error deleting booking",
  error_confirming_booking: "Error confirming booking",
  back: "Back",
  date_format_hint: "YYYY-MM-DD",
} as const;

export type TKey = keyof typeof T;

export function nightWord(n: number): string {
  return n > 1 ? "nights" : "night";
}

export function personWord(n: number): string {
  return n > 1 ? "people" : "person";
}

// Maps server-returned error i18n keys to the localized message above.
export function translateServerError(error: unknown): string {
  if (typeof error === "string" && error in T) {
    return T[error as TKey] as string;
  }
  return T.error_saving_booking;
}
