import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM!;

const client = Twilio(accountSid, authToken);

/**
 * Send a WhatsApp message via Twilio.
 * @param toE164 - Phone number in E.164 format (e.g., "+31612345678")
 * @param body - Message body text
 * @returns Object with Twilio message SID
 */
export async function sendWhatsApp(
  toE164: string,
  body: string
): Promise<{ sid: string }> {
  // Ensure "to" uses whatsapp: prefix
  const to = toE164.startsWith("whatsapp:") ? toE164 : `whatsapp:${toE164}`;

  // Ensure "from" uses whatsapp: prefix
  const from = whatsappFrom.startsWith("whatsapp:")
    ? whatsappFrom
    : `whatsapp:${whatsappFrom}`;

  const message = await client.messages.create({
    body,
    from,
    to,
  });

  return { sid: message.sid };
}
