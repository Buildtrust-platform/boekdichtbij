"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Booking } from "@/lib/types/booking";
import { TIME_WINDOWS } from "@/lib/timeWindows";
import { BARBER_SERVICES, formatPrice } from "@/lib/barberServices";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
      </main>
    );
  }

  const timeWindow = booking
    ? TIME_WINDOWS.find((tw) => tw.id === booking.timeWindowId)
    : null;
  const service = booking ? BARBER_SERVICES[booking.serviceType] : null;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Boeking bevestigd!</h1>
        <p className="text-gray-600 mb-6">
          Je boeking is succesvol geplaatst. We sturen je een bevestiging via
          e-mail.
        </p>

        {booking && (
          <div className="border rounded-lg p-4 mb-6 text-left space-y-3">
            <div>
              <div className="text-sm text-gray-500">Boekingsnummer</div>
              <div className="font-mono text-sm">{booking.bookingId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Datum</div>
              <div className="font-medium">
                {new Date(booking.date).toLocaleDateString("nl-NL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tijd</div>
              <div className="font-medium">{timeWindow?.label}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Dienst</div>
              <div className="font-medium">{service?.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium">
                {booking.status === "paid" && "Betaald"}
                {booking.status === "dispatched" && "In behandeling"}
                {booking.status === "assigned" && "Kapper toegewezen"}
                {booking.status === "pending" && "Wachtend op betaling"}
              </div>
            </div>
            <hr />
            <div className="flex justify-between">
              <div className="font-medium">Totaal betaald</div>
              <div className="font-bold">{formatPrice(booking.amount)}</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/mijn-afspraken"
            className="block w-full bg-black text-white py-3 rounded hover:bg-gray-800"
          >
            Mijn afspraken
          </Link>
          <Link
            href="/"
            className="block w-full border border-gray-300 py-3 rounded hover:bg-gray-50"
          >
            Terug naar home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><p>Laden...</p></main>}>
      <SuccessContent />
    </Suspense>
  );
}
