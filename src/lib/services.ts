/**
 * Locked services configuration
 * DO NOT MODIFY without approval
 */

export interface Service {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const SERVICES = {
  // Core services
  bookSearch: {
    id: "book-search",
    name: "Boeken Zoeken",
    description: "Zoek boeken op titel, auteur of ISBN",
    enabled: true,
  },

  bookListing: {
    id: "book-listing",
    name: "Boeken Aanbieden",
    description: "Bied je boeken aan voor verkoop of ruil",
    enabled: true,
  },

  messaging: {
    id: "messaging",
    name: "Berichten",
    description: "Communiceer veilig met andere gebruikers",
    enabled: true,
  },

  // Location services
  geolocation: {
    id: "geolocation",
    name: "Locatiediensten",
    description: "Vind boeken bij jou in de buurt",
    enabled: true,
  },

  // User services
  userProfile: {
    id: "user-profile",
    name: "Gebruikersprofiel",
    description: "Beheer je profielgegevens",
    enabled: true,
  },

  userRatings: {
    id: "user-ratings",
    name: "Beoordelingen",
    description: "Bekijk en geef beoordelingen",
    enabled: true,
  },

  // Notification services
  emailNotifications: {
    id: "email-notifications",
    name: "E-mailmeldingen",
    description: "Ontvang updates via e-mail",
    enabled: true,
  },

  pushNotifications: {
    id: "push-notifications",
    name: "Pushmeldingen",
    description: "Ontvang meldingen op je apparaat",
    enabled: false,
  },

  // Safety services
  reportingSystem: {
    id: "reporting-system",
    name: "Meldsysteem",
    description: "Meld ongepast gedrag of inhoud",
    enabled: true,
  },

  userBlocking: {
    id: "user-blocking",
    name: "Gebruikers Blokkeren",
    description: "Blokkeer ongewenste contacten",
    enabled: true,
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

export function isServiceEnabled(serviceId: ServiceId): boolean {
  return SERVICES[serviceId]?.enabled ?? false;
}

export function getService(serviceId: ServiceId): Service | undefined {
  return SERVICES[serviceId];
}

export function getAllEnabledServices(): Service[] {
  return Object.values(SERVICES).filter((service) => service.enabled);
}
