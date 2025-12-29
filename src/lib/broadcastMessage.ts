/**
 * Shared broadcast message builder for Wave 1 and Wave 2 dispatch.
 * All Dutch copy comes from COPY constants.
 */

import { COPY } from "@/lib/copy";

interface BroadcastBooking {
  serviceName: string;
  timeWindowLabel: string;
  place?: string;
  area: string;
  payoutCents: number;
  acceptCode: string;
}

function formatPayout(cents: number): string {
  const euros = cents / 100;
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2);
}

/**
 * Build the WhatsApp broadcast message for provider dispatch.
 * Used by both Wave 1 and Wave 2.
 */
export function buildBroadcastMessage(booking: BroadcastBooking): string {
  const location = booking.place || booking.area;
  const payoutEuros = formatPayout(booking.payoutCents);

  return `${COPY.dispatch.broadcastHeader}

${COPY.dispatch.broadcastService}: ${booking.serviceName}
${COPY.dispatch.broadcastTimeSlot}: ${booking.timeWindowLabel}
${COPY.dispatch.broadcastLocation}: ${location}
${COPY.dispatch.broadcastPayout}: €${payoutEuros}

${COPY.dispatch.broadcastAccept}
${COPY.dispatch.broadcastCode}: ${booking.acceptCode}`;
}
