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

type PageState = "loading" | "pending" | "assigned" | "unfilled" | "cancelled" | "not_found" | "error";

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

        setState("pending");
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
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-600">Laden...</p>
      </main>
    );
  }

  if (state === "not_found") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-4">Boeking niet gevonden</h1>
          <Link
            href="/rotterdam/ridderkerk/kapper"
            className="text-gray-600 hover:underline"
          >
            Terug
          </Link>
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-4">Probeer opnieuw.</h1>
          <Link
            href="/rotterdam/ridderkerk/kapper"
            className="text-gray-600 hover:underline"
          >
            Terug
          </Link>
        </div>
      </main>
    );
  }

  if (state === "pending") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-4">Boeking ontvangen</h1>
          <p className="text-gray-600 mb-2">
            Wij controleren de beschikbaarheid.
          </p>
          <p className="text-gray-600">Dit duurt meestal enkele minuten.</p>
        </div>
      </main>
    );
  }

  if (state === "assigned" && booking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-6">Boeking bevestigd</h1>
          <ul className="space-y-1 text-gray-700">
            <li>Dienst: {booking.serviceName}</li>
            <li>Tijdvak: {booking.timeWindowLabel}</li>
            <li>Adres: {booking.address}, {booking.postcode} {booking.place}</li>
          </ul>
        </div>
      </main>
    );
  }

  if (state === "unfilled") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-4">Geen beschikbaarheid</h1>
          <p className="text-gray-600 mb-6">
            Er was geen kapper beschikbaar voor het gekozen tijdvak.
          </p>
          <div className="space-y-3">
            <Link
              href="/rotterdam/ridderkerk/kapper"
              className="block w-full text-center border border-gray-300 py-3 rounded hover:bg-gray-50"
            >
              Kies een andere tijd
            </Link>
            <button
              disabled
              className="block w-full text-center border border-gray-200 py-3 rounded text-gray-400 cursor-not-allowed"
            >
              Ontvang terugbetaling
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (state === "cancelled") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-4">Boeking verlopen</h1>
          <p className="text-gray-600 mb-6">
            De boeking is niet bevestigd.
          </p>
          <Link
            href="/rotterdam/ridderkerk/kapper"
            className="block w-full text-center border border-gray-300 py-3 rounded hover:bg-gray-50"
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
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center px-4"><p className="text-gray-600">Laden...</p></main>}>
      <SuccessContent />
    </Suspense>
  );
}
