/**
 * Barber services configuration
 */

export interface BarberService {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  durationMinutes: number;
  enabled: boolean;
}

export const BARBER_SERVICES: Record<string, BarberService> = {
  haircut: {
    id: "haircut",
    name: "Knipbeurt",
    description: "Standaard knipbeurt",
    priceInCents: 2500, // EUR 25.00
    durationMinutes: 30,
    enabled: true,
  },
  beardTrim: {
    id: "beard-trim",
    name: "Baard trimmen",
    description: "Baard bijwerken en vormgeven",
    priceInCents: 1500, // EUR 15.00
    durationMinutes: 15,
    enabled: true,
  },
  haircutAndBeard: {
    id: "haircut-beard",
    name: "Knipbeurt + Baard",
    description: "Compleet verzorgingspakket",
    priceInCents: 3500, // EUR 35.00
    durationMinutes: 45,
    enabled: true,
  },
} as const;

export type ServiceId = keyof typeof BARBER_SERVICES;

export function getServicePrice(serviceId: string): number {
  return BARBER_SERVICES[serviceId]?.priceInCents ?? 0;
}

export function getService(serviceId: string): BarberService | undefined {
  return BARBER_SERVICES[serviceId];
}

export function getAllEnabledServices(): BarberService[] {
  return Object.values(BARBER_SERVICES).filter((service) => service.enabled);
}

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(priceInCents / 100);
}
