"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Booking } from "@/lib/types/booking";
import { TIME_WINDOWS } from "@/lib/timeWindows";
import { BARBER_SERVICES, formatPrice } from "@/lib/barberServices";

const STATUS_LABELS: Record<string, string> = {
  pending: "Wachtend op betaling",
  paid: "Betaald",
  dispatched: "In behandeling",
  assigned: "Kapper toegewezen",
  completed: "Voltooid",
  cancelled: "Geannuleerd",
};

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Fout bij ophalen boeking");
          return;
        }

        setBooking(data);
      } catch {
        setError("Er is iets misgegaan");
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error || "Boeking niet gevonden"}
          </div>
          <Link
            href="/mijn-afspraken"
            className="block text-center border border-gray-300 py-3 rounded hover:bg-gray-50"
          >
            Terug naar mijn afspraken
          </Link>
        </div>
      </main>
    );
  }

  const timeWindow = TIME_WINDOWS.find((tw) => tw.id === booking.timeWindowId);
  const service = BARBER_SERVICES[booking.serviceType];
  const dateObj = new Date(booking.date);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <Link
          href="/mijn-afspraken"
          className="text-gray-500 hover:text-gray-800 mb-4 inline-block"
        >
          ← Terug
        </Link>

        <h1 className="text-2xl font-bold mb-6">Afspraakdetails</h1>

        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <span
              className={`inline-block px-2 py-1 rounded text-sm ${
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

          <div>
            <div className="text-sm text-gray-500">Boekingsnummer</div>
            <div className="font-mono text-sm">{booking.bookingId}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Datum</div>
            <div className="font-medium">
              {dateObj.toLocaleDateString("nl-NL", {
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
            <div className="text-sm text-gray-500">{service?.description}</div>
          </div>

          <hr />

          <div className="flex justify-between">
            <div className="font-medium">Totaal</div>
            <div className="font-bold">{formatPrice(booking.amount)}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Geboekt op</div>
            <div className="text-sm">
              {new Date(booking.createdAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {booking.status === "pending" && (
          <Link
            href={`/boeken/betalen?bookingId=${booking.bookingId}`}
            className="mt-4 block w-full text-center bg-black text-white py-3 rounded hover:bg-gray-800"
          >
            Betalen
          </Link>
        )}
      </div>
    </main>
  );
}
