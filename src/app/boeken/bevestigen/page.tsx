"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TIME_WINDOWS } from "@/lib/timeWindows";
import { BARBER_SERVICES, formatPrice } from "@/lib/barberServices";

function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const slot = searchParams.get("slot");
  const serviceId = searchParams.get("service");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  if (!date || !slot || !serviceId) {
    router.push("/boeken");
    return null;
  }

  const timeWindow = TIME_WINDOWS.find((tw) => tw.id === slot);
  const service = BARBER_SERVICES[serviceId];

  if (!timeWindow || !service) {
    router.push("/boeken");
    return null;
  }

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleConfirm() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          timeWindowId: slot,
          serviceType: serviceId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/boeken/bevestigen?date=${date}&slot=${slot}&service=${serviceId}`);
          return;
        }
        setError(data.error || "Boeking maken mislukt");
        return;
      }

      router.push(`/boeken/betalen?bookingId=${data.bookingId}`);
    } catch {
      setError("Er is iets misgegaan");
    } finally {
      setLoading(false);
    }
  }

  if (isLoggedIn === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Bevestigen</h1>
        <p className="text-gray-600 mb-6">Stap 3 van 4</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
        )}

        <div className="border rounded-lg p-4 mb-6 space-y-4">
          <div>
            <div className="text-sm text-gray-500">Datum</div>
            <div className="font-medium">{formattedDate}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Tijd</div>
            <div className="font-medium">{timeWindow.label}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Dienst</div>
            <div className="font-medium">{service.name}</div>
            <div className="text-sm text-gray-500">{service.description}</div>
          </div>
          <hr />
          <div className="flex justify-between">
            <div className="font-medium">Totaal</div>
            <div className="font-bold">{formatPrice(service.priceInCents)}</div>
          </div>
        </div>

        {!isLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm">
              Je moet ingelogd zijn om te boeken.{" "}
              <a
                href={`/login?redirect=/boeken/bevestigen?date=${date}&slot=${slot}&service=${serviceId}`}
                className="text-blue-600 hover:underline"
              >
                Inloggen
              </a>{" "}
              of{" "}
              <a
                href={`/register?redirect=/boeken/bevestigen?date=${date}&slot=${slot}&service=${serviceId}`}
                className="text-blue-600 hover:underline"
              >
                registreren
              </a>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 py-3 rounded hover:bg-gray-50"
          >
            Terug
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !isLoggedIn}
            className="flex-1 bg-black text-white py-3 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Laden..." : "Bevestigen & Betalen"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><p>Laden...</p></main>}>
      <BookingConfirmContent />
    </Suspense>
  );
}
