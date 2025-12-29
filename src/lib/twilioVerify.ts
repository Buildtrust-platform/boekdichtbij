import twilio from "twilio";

/**
 * Twilio Webhook Signature Verification
 *
 * IMPORTANT: Twilio must be configured with the exact webhook URL you validate.
 * If a reverse proxy, CDN, or load balancer modifies the request URL,
 * signature validation will fail. Ensure the URL in your Twilio console
 * matches NEXT_PUBLIC_APP_URL + "/api/whatsapp/inbound" exactly.
 *
 * For local development without ngrok, use the x-dev-bypass header
 * with OPS_TOKEN value (only works when NODE_ENV !== "production").
 */

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

/**
 * Verify Twilio webhook signature using the official Twilio SDK.
 *
 * @param params - Key/value pairs from the form-urlencoded body
 * @param signature - Value of X-Twilio-Signature header
 * @param url - Full public URL that Twilio called (e.g., https://example.com/api/whatsapp/inbound)
 * @returns true if signature is valid, false otherwise
 */
export function verifyTwilioSignature(
  params: Record<string, string>,
  signature: string,
  url: string
): boolean {
  if (!TWILIO_AUTH_TOKEN) {
    console.error("[twilioVerify] TWILIO_AUTH_TOKEN not configured");
    return false;
  }

  if (!signature) {
    console.warn("[twilioVerify] Missing signature");
    return false;
  }

  try {
    return twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, params);
  } catch (err) {
    console.error("[twilioVerify] Validation error:", err);
    return false;
  }
}
