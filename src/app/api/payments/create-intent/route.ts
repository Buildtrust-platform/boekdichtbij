import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getBookingById, updateBookingPaymentIntent } from "@/lib/db/bookings";
import { getStripe } from "@/lib/stripe";
import { getService, formatPrice } from "@/lib/barberServices";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Boeking ID is verplicht" },
        { status: 400 }
      );
    }

    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Boeking niet gevonden" },
        { status: 404 }
      );
    }

    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: "Geen toegang tot deze boeking" },
        { status: 403 }
      );
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Deze boeking kan niet meer betaald worden" },
        { status: 400 }
      );
    }

    // If already has a payment intent, return that
    if (booking.paymentIntentId) {
      const existingIntent = await getStripe().paymentIntents.retrieve(
        booking.paymentIntentId
      );
      return NextResponse.json({ clientSecret: existingIntent.client_secret });
    }

    const service = getService(booking.serviceType);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: booking.amount,
      currency: "eur",
      metadata: {
        bookingId: booking.bookingId,
        userId: booking.userId,
        serviceType: booking.serviceType,
      },
      description: service
        ? `${service.name} - ${formatPrice(booking.amount)}`
        : `Boeking ${bookingId}`,
    });

    await updateBookingPaymentIntent(bookingId, paymentIntent.id);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Create payment intent error:", error);
    return NextResponse.json(
      { error: "Betaling starten mislukt" },
      { status: 500 }
    );
  }
}
