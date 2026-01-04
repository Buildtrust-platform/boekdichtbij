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

  // Herenkapper services
  herenkapper: {
    "heren-standaard": "Heren Standaard Knipbeurt",
    "heren-knip-baard": "Heren Knipbeurt + Baard",
    "heren-special": "Heren Special Treatment",
  },

  // Dameskapper services
  dameskapper: {
    "dames-kort": "Dames Kort Haar",
    "dames-lang": "Dames Lang Haar",
    "dames-special": "Dames Special Treatment",
  },

  // Booking
  booking: {
    headerLabel: "BoekDichtbij",
    h1Ridderkerk: "Boek een kapper in Ridderkerk",
    sublineRidderkerk: "Beschikbaar in Ridderkerk en omgeving",
    h1Herenkapper: "Boek een herenkapper",
    sublineHerenkapper: "Professionele herenkapper bij jou in de buurt",
    h1Dameskapper: "Boek een dameskapper",
    sublineDameskapper: "Professionele dameskapper bij jou in de buurt",
    chooseService: "Kies een dienst",
    chooseTime: "Kies een tijd",
    timeNote: "Tijden zijn tijdsvakken.",
    timeWindowToday1500: "Vandaag 15:00–16:00",
    timeWindowToday1600: "Vandaag 16:00–17:00",
    timeWindowTomorrow1000: "Morgen 10:00–11:00",
    timeWindowTomorrow1100: "Morgen 11:00–12:00",
    location: "Locatie",
    details: "Gegevens",
    detailsNote: "Deze gegevens worden alleen gebruikt voor de boeking.",
    summary: "Samenvatting",
    cta: "Bevestig en betaal",
    ctaSubtext: "Betaling bevestigt de boeking.",
    guarantee: "Als er geen kapper beschikbaar is voor het gekozen tijdvak, wordt u automatisch terugbetaald of opnieuw ingepland.",
    receivedTitle: "Boeking ontvangen",
    receivedLine1: "Wij controleren de beschikbaarheid.",
    receivedLine2: "Dit duurt meestal enkele minuten.",
    genericError: "De boeking kon niet worden voltooid.",
    cancelledTitle: "Betaling geannuleerd",
    cancelledLine1: "De betaling is niet voltooid.",
    cancelledLine2: "Je kunt een nieuwe boeking maken.",
    tryAgain: "Opnieuw proberen",
  },

  // Dispatch (provider WhatsApp messages)
  dispatch: {
    broadcastHeader: "Nieuwe betaalde boeking via BoekDichtbij",
    broadcastService: "Dienst",
    broadcastTimeSlot: "Tijdvak",
    broadcastLocation: "Locatie",
    broadcastPayout: "Uitbetaling",
    broadcastAccept: "Antwoord JA om te accepteren.",
    broadcastCode: "Code",
  },

  // Acceptance flow (provider WhatsApp replies)
  acceptance: {
    alreadyAssigned: "De boeking is inmiddels toegewezen.",
    assignedConfirm: "Boeking toegewezen.",
    detailsFollow: "Klantgegevens volgen.",
    bookingDetails: "Boekingsgegevens",
    service: "Dienst",
    timeSlot: "Tijdvak",
    address: "Adres",
    customerName: "Naam klant",
    phone: "Telefoon",
    payout: "Uitbetaling",
    invalidCode: "Onbekende code. Stuur JA gevolgd door de code.",
    notJa: "Antwoord JA gevolgd door de code om te accepteren.",
  },

  // Provider invite (WhatsApp message)
  providerInvite: {
    intro: "BoekDichtbij stuurt betaalde boekingen.",
    instruction: "Wil je meedoen? Open:",
  },

  // Provider claim page
  providerClaim: {
    pageTitle: "Activeer je account",
    pageSubtitle: "Vul je gegevens in om boekingen te ontvangen.",
    whatsappLabel: "WhatsApp-nummer",
    whatsappHint: "Gebruik formaat +31612345678",
    whatsappRequired: "WhatsApp-nummer is verplicht",
    whatsappInvalid: "Ongeldig telefoonnummer. Gebruik formaat +31612345678",
    whatsappInUse: "Dit nummer is al gekoppeld aan een ander account.",
    payoutLabel: "Uitbetalingsvoorkeur",
    payoutPercentage: "Percentage van boeking",
    payoutFixed: "Vast bedrag per boeking",
    percentageLabel: "Percentage",
    fixedAmountLabel: "Vast bedrag (euro)",
    activateLabel: "Account activeren",
    activateDescription: "Je ontvangt boekingen zodra je activeert.",
    submitButton: "Activeren",
    successTitle: "Account geactiveerd",
    successMessage: "Je ontvangt nu boekingen via WhatsApp.",
    invalidInvite: "Ongeldige of verlopen uitnodiging.",
    alreadyUsed: "Deze uitnodiging is al gebruikt.",
  },
} as const;

export type CopyKeys = keyof typeof COPY;
