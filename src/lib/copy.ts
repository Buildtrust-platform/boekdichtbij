/**
 * Locked copy file - Dutch safety translations
 * DO NOT MODIFY without approval
 */

export const COPY = {
  // General
  appName: "BoekDichtbij",
  tagline: "Vind boeken bij jou in de buurt",

  // Navigation
  nav: {
    home: "Home",
    search: "Zoeken",
    myBooks: "Mijn Boeken",
    profile: "Profiel",
    settings: "Instellingen",
    logout: "Uitloggen",
    login: "Inloggen",
    register: "Registreren",
  },

  // Actions
  actions: {
    save: "Opslaan",
    cancel: "Annuleren",
    delete: "Verwijderen",
    edit: "Bewerken",
    confirm: "Bevestigen",
    back: "Terug",
    next: "Volgende",
    submit: "Versturen",
    close: "Sluiten",
  },

  // Messages
  messages: {
    loading: "Laden...",
    error: "Er is iets misgegaan",
    success: "Gelukt!",
    notFound: "Niet gevonden",
    noResults: "Geen resultaten gevonden",
    confirmDelete: "Weet je zeker dat je dit wilt verwijderen?",
  },

  // Forms
  forms: {
    required: "Dit veld is verplicht",
    invalidEmail: "Ongeldig e-mailadres",
    invalidPhone: "Ongeldig telefoonnummer",
    passwordMismatch: "Wachtwoorden komen niet overeen",
    minLength: (min: number) => `Minimaal ${min} tekens`,
    maxLength: (max: number) => `Maximaal ${max} tekens`,
  },

  // Safety & Privacy
  safety: {
    privacyNotice: "We respecteren je privacy",
    dataProtection: "Je gegevens worden veilig bewaard",
    locationConsent: "We gebruiken je locatie alleen om boeken in de buurt te tonen",
    noShareWithoutConsent: "We delen je gegevens nooit zonder toestemming",
    reportAbuse: "Misbruik melden",
    blockUser: "Gebruiker blokkeren",
    safetyTips: "Veiligheidstips",
    meetInPublic: "Spreek af op een openbare plek",
    tellSomeone: "Vertel iemand waar je naartoe gaat",
    trustYourInstinct: "Vertrouw op je gevoel",
  },

  // Accessibility
  a11y: {
    skipToContent: "Ga naar inhoud",
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    loading: "Bezig met laden",
    required: "verplicht",
  },
} as const;

export type CopyKeys = keyof typeof COPY;
