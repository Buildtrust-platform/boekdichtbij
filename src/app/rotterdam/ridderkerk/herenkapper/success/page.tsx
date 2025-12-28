"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface BookingData {
  bookingId: string;
  status: string;
  serviceName: string;
  timeWindowLabel: string;
  address: string;
  postcode: string;
  place: string;
}

type PageState =
  | "loading"
  | "pending_payment"
  | "pending_assignment"
  | "assigned"
  | "unfilled"
  | "cancelled"
  | "not_found"
  | "error";

function BookingSummary({ booking }: { booking: BookingData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Dienst</span>
          <span className="text-gray-900">{booking.serviceName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tijdvak</span>
          <span className="text-gray-900">{booking.timeWindowLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Locatie</span>
          <span className="text-gray-900 text-right">
            {booking.address}, {booking.postcode} {booking.place}
          </span>
        </div>
      </div>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [state, setState] = useState<PageState>("loading");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!bookingId) {
      setState("not_found");
      return;
    }

    async function poll() {
      if (!mountedRef.current) return;

      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          cache: "no-store",
        });

        if (!mountedRef.current) return;

        if (!res.ok) {
          if (res.status === 404) {
            setState("not_found");
          } else {
            setState("error");
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        const data: BookingData = await res.json();

        if (!mountedRef.current) return;

        setBooking(data);

        if (data.status === "PENDING_PAYMENT") {
          setState("pending_payment");
          return;
        }

        if (data.status === "ASSIGNED") {
          setState("assigned");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        if (data.status === "UNFILLED") {
          setState("unfilled");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        if (data.status === "CANCELLED") {
          setState("cancelled");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        setState("pending_assignment");
      } catch {
        if (!mountedRef.current) return;
        setState("error");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 4000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [bookingId]);

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500">Laden...</p>
      </main>
    );
  }

  if (state === "not_found") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Boeking niet gevonden
          </h1>
          <p className="text-gray-500 mb-6">
            Deze boeking bestaat niet of is verlopen.
          </p>
          <Link
            href="/rotterdam/ridderkerk/herenkapper"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Nieuwe boeking
          </Link>
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Er ging iets mis
          </h1>
          <p className="text-gray-500 mb-6">
            Probeer de pagina te vernieuwen.
          </p>
          <Link
            href="/rotterdam/ridderkerk/herenkapper"
            className="inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Probeer opnieuw
          </Link>
        </div>
      </main>
    );
  }

  if (state === "pending_payment") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-6 animate-spin" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Betaling verwerken...
          </h1>
          <p className="text-gray-500">Even geduld.</p>
        </div>
      </main>
    );
  }

  if (state === "pending_assignment") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-6 animate-spin" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Beschikbaarheid controleren
          </h1>
          <p className="text-gray-500 mb-1">
            We zoeken een beschikbare kapper.
          </p>
          <p className="text-gray-500">
            Dit duurt meestal enkele minuten.
          </p>
          {booking && <BookingSummary booking={booking} />}
        </div>
      </main>
    );
  }

  if (state === "assigned" && booking) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Boeking bevestigd
          </h1>
          <p className="text-gray-500">
            Een kapper is toegewezen aan je afspraak.
          </p>
          <BookingSummary booking={booking} />
        </div>
      </main>
    );
  }

  if (state === "unfilled") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Geen beschikbaarheid
          </h1>
          <p className="text-gray-500 mb-6">
            Er was geen kapper beschikbaar voor het gekozen tijdvak.
          </p>
          <div className="space-y-3">
            <Link
              href="/rotterdam/ridderkerk/herenkapper"
              className="block w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Kies een andere tijd
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (state === "cancelled") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Boeking verlopen
          </h1>
          <p className="text-gray-500 mb-6">
            De boeking is niet bevestigd.
          </p>
          <Link
            href="/rotterdam/ridderkerk/herenkapper"
            className="block w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Probeer opnieuw
          </Link>
        </div>
      </main>
    );
  }

  return null;
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <p className="text-gray-500">Laden...</p>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
