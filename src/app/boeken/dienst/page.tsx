"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BARBER_SERVICES, formatPrice } from "@/lib/barberServices";

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
      <main className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
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
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Kies een dienst</h1>
        <p className="text-gray-600 mb-6">Stap 2 van 4</p>

        <div className="space-y-6">
          <div className="space-y-3">
            {services.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 rounded border text-left ${
                    isSelected
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm opacity-75">
                        {service.description}
                      </div>
                      <div className="text-sm opacity-75 mt-1">
                        {service.durationMinutes} minuten
                      </div>
                    </div>
                    <div className="font-bold">
                      {formatPrice(service.priceInCents)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 py-3 rounded hover:bg-gray-50"
            >
              Terug
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedService}
              className="flex-1 bg-black text-white py-3 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Volgende
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BookingServicePage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><p>Laden...</p></main>}>
      <BookingServiceContent />
    </Suspense>
  );
}
