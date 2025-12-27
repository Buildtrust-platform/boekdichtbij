"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserBooking } from "@/lib/types/booking";
import { TIME_WINDOWS } from "@/lib/timeWindows";
import { BARBER_SERVICES } from "@/lib/barberServices";

const STATUS_LABELS: Record<string, string> = {
  pending: "Wachtend op betaling",
  paid: "Betaald",
  dispatched: "In behandeling",
  assigned: "Kapper toegewezen",
  completed: "Voltooid",
  cancelled: "Geannuleerd",
};

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings");

        if (res.status === 401) {
          router.push("/login?redirect=/mijn-afspraken");
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Fout bij ophalen boekingen");
          return;
        }

        setBookings(data.bookings);
      } catch {
        setError("Er is iets misgegaan");
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mijn afspraken</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
        )}

        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Je hebt nog geen afspraken.</p>
            <Link
              href="/boeken"
              className="inline-block bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
            >
              Afspraak maken
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const timeWindow = TIME_WINDOWS.find(
                (tw) => tw.id === booking.timeWindowId
              );
              const service = BARBER_SERVICES[booking.serviceType];
              const dateObj = new Date(booking.date);

              return (
                <Link
                  key={booking.bookingId}
                  href={`/mijn-afspraken/${booking.bookingId}`}
                  className="block border rounded-lg p-4 hover:border-gray-400 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{service?.name}</div>
                      <div className="text-sm text-gray-500">
                        {dateObj.toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {" • "}
                        {timeWindow?.label}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        booking.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_LABELS[booking.status] || booking.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/boeken"
            className="block w-full text-center bg-black text-white py-3 rounded hover:bg-gray-800"
          >
            Nieuwe afspraak maken
          </Link>
        </div>
      </div>
    </main>
  );
}
