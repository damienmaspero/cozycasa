// Bilingual (English / French) string table for the UI. A small React
// context exposes the active language and lets components read translated
// strings via the `useT()` hook. The selection is persisted in
// `localStorage` on the web so it survives reloads; on native it lives in
// memory for the session (the app does not currently bundle AsyncStorage).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "fr";

export const SUPPORTED_LANGS: readonly Lang[] = ["en", "fr"] as const;

export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  fr: "Français",
};

// Each dictionary must expose the same keys; TypeScript enforces that below.
const EN = {
  // Home / auth
  app_title: "Family House",
  loading: "Loading…",
  cozy_casa: "Cozy Casa",
  sign_in: "Sign in",
  sign_up: "Sign up",
  sign_out: "Sign out",
  username: "Username",
  password: "Password",
  email: "Email",
  name: "Name",
  name_optional: "Name (optional)",
  sign_in_failed: "Sign-in failed",
  sign_up_failed: "Sign-up failed",
  already_have_account: "Already have an account? Sign in",
  need_first_account: "Need to create the first account? Sign up",
  checking_first_account:
    "Checking whether first-account sign-up is available…",
  sign_in_only_ask_admin:
    "Sign in only — ask an admin to create your account",
  signed_in_as: "Signed in as",
  organizations: "Organizations",
  no_organizations_yet: "No organizations yet.",
  open_calendar: "Open calendar",
  create_organization: "Create organization",
  slug_optional: "Slug (optional)",
  create: "Create",
  failed_create_organization: "Failed to create organization",
  create_member_for: "Create member for",
  role: "Role",
  create_member: "Create member",
  member_created_for: (member: string, org: string) =>
    `Member "${member}" created for ${org}`,
  failed_create_member: "Failed to create organization member",
  network_error_try_again:
    "Network error or unexpected response — please try again",
  language: "Language",

  // Calendar
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
  ] as readonly string[],
  weekdays_short: [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ] as readonly string[],
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
  name_placeholder: "Your name",
  number_of_guests: "Number of guests",
  guests_placeholder: "e.g. 4",
  comment_optional: "Comment (optional)",
  comment_placeholder: "Add a comment...",
  save_as_request:
    "Save as request (does not count toward capacity)",
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

  // Calendar screen pre-org states
  please_sign_in: "Please sign in.",
  choose_a_household: "Choose a household",
  not_member_of_any_org:
    "You aren’t a member of any organization yet.",
  not_member_of_that_org:
    "You are not a member of that organization.",
};

export type Dictionary = typeof EN;

const FR: Dictionary = {
  // Home / auth
  app_title: "Maison familiale",
  loading: "Chargement…",
  cozy_casa: "Cozy Casa",
  sign_in: "Se connecter",
  sign_up: "S’inscrire",
  sign_out: "Se déconnecter",
  username: "Nom d’utilisateur",
  password: "Mot de passe",
  email: "E-mail",
  name: "Nom",
  name_optional: "Nom (facultatif)",
  sign_in_failed: "Échec de la connexion",
  sign_up_failed: "Échec de l’inscription",
  already_have_account: "Vous avez déjà un compte ? Se connecter",
  need_first_account: "Créer le premier compte ? S’inscrire",
  checking_first_account:
    "Vérification de la disponibilité de l’inscription du premier compte…",
  sign_in_only_ask_admin:
    "Connexion uniquement — demandez à un administrateur de créer votre compte",
  signed_in_as: "Connecté en tant que",
  organizations: "Organisations",
  no_organizations_yet: "Aucune organisation pour l’instant.",
  open_calendar: "Ouvrir le calendrier",
  create_organization: "Créer une organisation",
  slug_optional: "Slug (facultatif)",
  create: "Créer",
  failed_create_organization: "Échec de la création de l’organisation",
  create_member_for: "Créer un membre pour",
  role: "Rôle",
  create_member: "Créer le membre",
  member_created_for: (member: string, org: string) =>
    `Membre « ${member} » créé pour ${org}`,
  failed_create_member: "Échec de la création du membre de l’organisation",
  network_error_try_again:
    "Erreur réseau ou réponse inattendue — veuillez réessayer",
  language: "Langue",

  // Calendar
  booking_calendar: "Calendrier des réservations",
  previous: "‹ Précédent",
  next: "Suivant ›",
  months: [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ],
  weekdays_short: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  guests_short: "invités",
  request_short: "demande",
  request_label: "demande",
  request_badge: "DEMANDE",
  others: "autre(s)",
  upcoming_bookings: "Réservations à venir",
  no_upcoming_bookings: "Aucune réservation à venir",
  bookings_for_night_of: "Réservations pour la nuit du",
  add_booking: "Ajouter une réservation",
  book_cta: "Réserver",
  new_booking: "Nouvelle réservation",
  edit_booking: "Modifier la réservation",
  book: "Réserver",
  update: "Mettre à jour",
  cancel: "Annuler",
  edit: "Modifier",
  delete: "Supprimer",
  confirm: "Confirmer",
  bookings: "Réservations",
  capacity: "Capacité",
  people: "personnes",
  spots_remaining: "place(s) restante(s)",
  requests: "Demandes",
  persons_requesting: "personne(s) en demande",
  from: "Du",
  to: "au",
  check_in_date: "Date d’arrivée",
  check_out_date: "Date de départ",
  name_placeholder: "Votre nom",
  number_of_guests: "Nombre d’invités",
  guests_placeholder: "ex. 4",
  comment_optional: "Commentaire (facultatif)",
  comment_placeholder: "Ajouter un commentaire...",
  save_as_request:
    "Enregistrer comme demande (ne compte pas dans la capacité)",
  available_spots: "Places disponibles",
  minimum_across_all_nights: "minimum sur toutes les nuits",
  request_mode_capacity_not_checked:
    "Mode demande : la capacité n’est pas vérifiée",
  no_spots_available: "Aucune place disponible pour cette période",
  check_out_must_be_after:
    "La date de départ doit être postérieure à la date d’arrivée",
  cannot_book_past_date: "Impossible de réserver une date passée",
  booking_not_found: "Réservation introuvable",
  booking_created_success: "Réservation créée avec succès !",
  booking_updated_success: "Réservation mise à jour avec succès !",
  booking_deleted_success: "Réservation supprimée avec succès",
  booking_confirmed_success: "Réservation confirmée avec succès !",
  confirm_delete_booking:
    "Voulez-vous vraiment supprimer cette réservation ?",
  confirm_this_booking: "Confirmer cette réservation ?",
  error_saving_booking: "Erreur lors de l’enregistrement de la réservation",
  error_deleting_booking: "Erreur lors de la suppression de la réservation",
  error_confirming_booking: "Erreur lors de la confirmation de la réservation",
  back: "Retour",
  date_format_hint: "AAAA-MM-JJ",

  // Calendar screen pre-org states
  please_sign_in: "Veuillez vous connecter.",
  choose_a_household: "Choisissez un foyer",
  not_member_of_any_org:
    "Vous n’êtes encore membre d’aucune organisation.",
  not_member_of_that_org:
    "Vous n’êtes pas membre de cette organisation.",
};

const DICTIONARIES: Record<Lang, Dictionary> = { en: EN, fr: FR };

export type TKey = keyof Dictionary;

const LANG_STORAGE_KEY = "cozycasa.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage?.getItem(LANG_STORAGE_KEY);
    if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
      return stored as Lang;
    }
  } catch {
    // localStorage may be unavailable (e.g. SSR, privacy mode); fall through.
  }
  const nav =
    typeof navigator !== "undefined" ? navigator.language : undefined;
  if (typeof nav === "string" && nav.toLowerCase().startsWith("fr")) {
    return "fr";
  }
  return "en";
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Persistence is best-effort.
    }
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: DICTIONARIES[lang] }),
    [lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  // Fallback for components rendered without a provider (e.g. tests): act
  // like a stateless English context. setLang becomes a no-op.
  return { lang: "en", setLang: () => {}, t: EN };
}

export function useT(): Dictionary {
  return useLanguage().t;
}

export function nightWord(n: number, lang: Lang = "en"): string {
  if (lang === "fr") return n > 1 ? "nuits" : "nuit";
  return n > 1 ? "nights" : "night";
}

export function personWord(n: number, lang: Lang = "en"): string {
  if (lang === "fr") return n > 1 ? "personnes" : "personne";
  return n > 1 ? "people" : "person";
}

export function localeFor(lang: Lang): string {
  return lang === "fr" ? "fr-FR" : "en-US";
}

// Maps server-returned error i18n keys to the localized message.
export function translateServerError(
  error: unknown,
  lang: Lang = "en",
): string {
  const dict = DICTIONARIES[lang];
  if (typeof error === "string" && error in dict) {
    const value = dict[error as TKey];
    if (typeof value === "string") return value;
  }
  return dict.error_saving_booking;
}
