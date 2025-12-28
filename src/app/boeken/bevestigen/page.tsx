"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TIME_WINDOWS } from "@/lib/timeWindows";
import { BARBER_SERVICES, formatPrice } from "@/lib/barberServices";
import { Button, Card, Badge } from "@/components/ui";
import { ProgressSteps } from "@/components/ui/ProgressSteps";

const BOOKING_STEPS = [
  { label: "Datum" },
  { label: "Dienst" },
  { label: "Bevestig" },
  { label: "Betaal" },
];

function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const slot = searchParams.get("slot");
  const serviceId = searchParams.get("service");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const timeWindow = slot ? TIME_WINDOWS.find((tw) => tw.id === slot) : null;
  const service = serviceId ? BARBER_SERVICES[serviceId] : null;

  useEffect(() => {
    if (!date || !slot || !serviceId || !timeWindow || !service) {
      setShouldRedirect(true);
    }
  }, [date, slot, serviceId, timeWindow, service]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/boeken");
    }
  }, [shouldRedirect, router]);

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

  if (shouldRedirect || !date || !slot || !serviceId || !timeWindow || !service) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <LoadingSpinner />
          <span>Laden...</span>
        </div>
      </main>
    );
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
      const res = await fetch("/api/boeken", {
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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <LoadingSpinner />
          <span>Laden...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                <ScissorsIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">BoekDichtbij</span>
            </Link>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Annuleren
            </Link>
          </div>
          <ProgressSteps steps={BOOKING_STEPS} currentStep={3} />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bevestig je afspraak
          </h1>
          <p className="text-gray-500">
            Controleer de gegevens en ga door naar betaling
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3">
            <ErrorIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isLoggedIn && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  Log in om door te gaan
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Je moet ingelogd zijn om een afspraak te boeken.
                </p>
                <div className="flex gap-3 mt-3">
                  <Link
                    href={`/login?redirect=/boeken/bevestigen?date=${date}&slot=${slot}&service=${serviceId}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Inloggen
                  </Link>
                  <span className="text-amber-400">|</span>
                  <Link
                    href={`/register?redirect=/boeken/bevestigen?date=${date}&slot=${slot}&service=${serviceId}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Registreren
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Datum</p>
                <p className="font-medium text-gray-900 capitalize">{formattedDate}</p>
              </div>
              <CalendarIcon className="w-5 h-5 text-gray-400" />
            </div>

            <hr className="border-gray-100" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Tijdvak</p>
                <p className="font-medium text-gray-900">{timeWindow.label}</p>
              </div>
              <ClockIcon className="w-5 h-5 text-gray-400" />
            </div>

            <hr className="border-gray-100" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Dienst</p>
                <p className="font-medium text-gray-900">{service.name}</p>
                <p className="text-sm text-gray-500">{service.description}</p>
              </div>
              <Badge variant="primary">{service.durationMinutes} min</Badge>
            </div>
          </div>
        </Card>

        <Card variant="ghost" className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Totaal te betalen</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(service.priceInCents)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Incl. BTW</p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="flex-1"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Terug
            </Button>
            <Button
              onClick={handleConfirm}
              isLoading={loading}
              disabled={!isLoggedIn}
              size="lg"
              className="flex-1"
            >
              {loading ? "Laden..." : "Bevestigen & Betalen"}
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Na betaling zoeken wij een beschikbare kapper voor je.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <LoadingSpinner />
            <span>Laden...</span>
          </div>
        </main>
      }
    >
      <BookingConfirmContent />
    </Suspense>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
