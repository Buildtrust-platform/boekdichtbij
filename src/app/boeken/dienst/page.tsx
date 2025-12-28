"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BARBER_SERVICES, formatPrice } from "@/lib/barberServices";
import { Button } from "@/components/ui";
import { ProgressSteps } from "@/components/ui/ProgressSteps";

const BOOKING_STEPS = [
  { label: "Datum" },
  { label: "Dienst" },
  { label: "Bevestig" },
  { label: "Betaal" },
];

function BookingServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const slot = searchParams.get("slot");
  const [selectedService, setSelectedService] = useState("");

  const services = Object.values(BARBER_SERVICES).filter((s) => s.enabled);

  useEffect(() => {
    if (!date || !slot) {
      router.push("/boeken");
    }
  }, [date, slot, router]);

  if (!date || !slot) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <LoadingSpinner />
          <span>Laden...</span>
        </div>
      </main>
    );
  }

  function handleContinue() {
    if (selectedService) {
      router.push(
        `/boeken/bevestigen?date=${date}&slot=${slot}&service=${selectedService}`
      );
    }
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
          <ProgressSteps steps={BOOKING_STEPS} currentStep={2} />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wat wil je laten doen?
          </h1>
          <p className="text-gray-500">
            Kies de dienst die bij je past
          </p>
        </div>

        <div className="space-y-3">
          {services.map((service) => {
            const isSelected = selectedService === service.id;
            const isPopular = service.id === "haircutAndBeard";

            return (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`
                  relative w-full p-5 rounded-xl border-2 text-left transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                  ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 right-4 bg-primary-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Populair
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? "border-primary-500 bg-primary-500" : "border-gray-300"}
                    `}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3
                          className={`font-semibold ${isSelected ? "text-primary-700" : "text-gray-900"}`}
                        >
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {service.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                          <ClockIcon className="w-4 h-4" />
                          <span>{service.durationMinutes} minuten</span>
                        </div>
                      </div>
                      <span
                        className={`text-lg font-bold shrink-0 ${
                          isSelected ? "text-primary-600" : "text-gray-900"
                        }`}
                      >
                        {formatPrice(service.priceInCents)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200">
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
              onClick={handleContinue}
              disabled={!selectedService}
              size="lg"
              className="flex-1"
            >
              Volgende
              <ArrowRightIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BookingServicePage() {
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
      <BookingServiceContent />
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

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
