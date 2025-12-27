import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

export type SendWhatsAppResult =
  | { ok: true; mode: "twilio"; sid: string }
  | { ok: false; mode: "stub" }
  | { ok: false; mode: "twilio"; error: string };

let stubWarned = false;

function isEnabled(): boolean {
  return !!(
    accountSid &&
    authToken &&
    fromNumber &&
    !accountSid.includes("REPLACE") &&
    !authToken.includes("REPLACE") &&
    !fromNumber.includes("REPLACE")
  );
}

function formatWhatsApp(number: string): string {
  return number.startsWith("whatsapp:") ? number : `whatsapp:${number}`;
}

export async function sendWhatsApp(
  to: string,
  text: string
): Promise<SendWhatsAppResult> {
  if (!isEnabled()) {
    if (!stubWarned) {
      console.warn("[WhatsApp] Twilio not configured. Running in stub mode.");
      stubWarned = true;
    }
    console.log(`[WhatsApp STUB] To: ${to}`);
    console.log(`[WhatsApp STUB] Message:\n${text}`);
    return { ok: false, mode: "stub" };
  }

  const toFormatted = formatWhatsApp(to);
  const fromFormatted = formatWhatsApp(fromNumber!);

  try {
    const client = Twilio(accountSid!, authToken!);
    const message = await client.messages.create({
      body: text,
      from: fromFormatted,
      to: toFormatted,
    });

    console.log(`[WhatsApp] Sent to ${to}, SID: ${message.sid}`);
    return { ok: true, mode: "twilio", sid: message.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Failed to send to ${to}: ${errorMessage}`);
    return { ok: false, mode: "twilio", error: errorMessage };
  }
}

export interface BookingDetails {
  bookingId: string;
  serviceName: string;
  timeWindowLabel: string;
  place: string;
  payout: string;
}

export async function sendWhatsAppWithButtons(
  to: string,
  booking: BookingDetails
): Promise<SendWhatsAppResult> {
  if (!isEnabled()) {
    if (!stubWarned) {
      console.warn("[WhatsApp] Twilio not configured. Running in stub mode.");
      stubWarned = true;
    }
    console.log(`[WhatsApp STUB] To: ${to}`);
    console.log(`[WhatsApp STUB] Interactive booking message for: ${booking.bookingId}`);
    return { ok: false, mode: "stub" };
  }

  const toFormatted = formatWhatsApp(to);
  const fromFormatted = formatWhatsApp(fromNumber!);

  // Check if we have a Content Template SID configured
  const contentSid = process.env.TWILIO_BOOKING_TEMPLATE_SID;

  try {
    const client = Twilio(accountSid!, authToken!);

    if (contentSid) {
      // Use pre-approved Content Template with buttons
      const message = await client.messages.create({
        from: fromFormatted,
        to: toFormatted,
        contentSid: contentSid,
        contentVariables: JSON.stringify({
          1: booking.serviceName,
          2: booking.timeWindowLabel,
          3: booking.place,
          4: booking.payout,
        }),
      });

      console.log(`[WhatsApp] Sent template to ${to}, SID: ${message.sid}`);
      return { ok: true, mode: "twilio", sid: message.sid };
    } else {
      // No template configured, send text with emoji buttons as visual cue
      const text = `*Nieuwe boeking via BoekDichtbij*

Dienst: ${booking.serviceName}
Tijdvak: ${booking.timeWindowLabel}
Locatie: ${booking.place}
Uitbetaling: €${booking.payout}

Antwoord *JA* om te accepteren of *NEE* om te weigeren.`;

      const message = await client.messages.create({
        body: text,
        from: fromFormatted,
        to: toFormatted,
      });

      console.log(`[WhatsApp] Sent to ${to}, SID: ${message.sid}`);
      return { ok: true, mode: "twilio", sid: message.sid };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Failed to send to ${to}: ${errorMessage}`);
    return { ok: false, mode: "twilio", error: errorMessage };
  }
}
