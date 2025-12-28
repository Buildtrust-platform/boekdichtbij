import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import {
  getBookingByPaymentIntent,
  getBookingById,
  updateBookingStatus,
} from "@/lib/db/bookings";
import { dispatchBookingToProviders } from "@/lib/db/dispatch";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const booking = await getBookingByPaymentIntent(paymentIntent.id);

        if (booking) {
          // Update status: pending -> paid -> dispatched
          await updateBookingStatus(booking.bookingId, "paid");
          await updateBookingStatus(booking.bookingId, "dispatched");
          console.log(`Booking ${booking.bookingId} marked as paid and dispatched`);

          // Fetch full booking to dispatch to providers
          const fullBooking = await getBookingById(booking.bookingId);
          if (fullBooking) {
            const result = await dispatchBookingToProviders(fullBooking);
            console.log(
              `Booking ${booking.bookingId} dispatch result:`,
              result
            );
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const booking = await getBookingByPaymentIntent(paymentIntent.id);

        if (booking) {
          await updateBookingStatus(booking.bookingId, "cancelled");
          console.log(`Booking ${booking.bookingId} cancelled due to payment failure`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
