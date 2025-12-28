"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TIME_WINDOWS, DAYS_OF_WEEK } from "@/lib/timeWindows";
import { Button } from "@/components/ui";
import { ProgressSteps } from "@/components/ui/ProgressSteps";

const BOOKING_STEPS = [
  { label: "Datum" },
  { label: "Dienst" },
  { label: "Bevestig" },
  { label: "Betaal" },
];

export default function BookingDatePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  function getDayLabel(date: Date): string {
    const dayIndex = date.getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return DAYS_OF_WEEK[adjustedIndex].label;
  }

  function handleContinue() {
    if (selectedDate && selectedSlot) {
      router.push(`/boeken/dienst?date=${selectedDate}&slot=${selectedSlot}`);
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
          <ProgressSteps steps={BOOKING_STEPS} currentStep={1} />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wanneer wil je een afspraak?
          </h1>
          <p className="text-gray-500">
            Kies een datum en tijdvak dat jou uitkomt
          </p>
        </div>

        <div className="space-y-8">
          {/* Date Selection */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Selecteer een datum
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dates.map((date, index) => {
                const dateStr = formatDate(date);
                const isSelected = selectedDate === dateStr;
                const isToday = index === 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      relative p-3 rounded-xl border-2 text-left transition-all duration-150
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                      ${
                        isSelected
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    {isToday && (
                      <span className="absolute -top-2 -right-1 bg-primary-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                        Vandaag
                      </span>
                    )}
                    <div
                      className={`font-medium ${isSelected ? "text-primary-700" : "text-gray-900"}`}
                    >
                      {getDayLabel(date)}
                    </div>
                    <div
                      className={`text-sm ${isSelected ? "text-primary-600" : "text-gray-500"}`}
                    >
                      {date.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Time Slot Selection */}
          {selectedDate && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Kies een tijdvak
              </h2>
              <div className="space-y-2">
                {TIME_WINDOWS.map((tw) => {
                  const isSelected = selectedSlot === tw.id;
                  return (
                    <button
                      key={tw.id}
                      onClick={() => setSelectedSlot(tw.id)}
                      className={`
                        w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                        ${
                          isSelected
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      <div
                        className={`
                          shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                          ${isSelected ? "border-primary-500 bg-primary-500" : "border-gray-300"}
                        `}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <span
                          className={`font-medium ${isSelected ? "text-primary-700" : "text-gray-900"}`}
                        >
                          {tw.label}
                        </span>
                      </div>
                      <TimeIcon className={`w-5 h-5 ${isSelected ? "text-primary-500" : "text-gray-400"}`} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <Button
            onClick={handleContinue}
            disabled={!selectedDate || !selectedSlot}
            size="lg"
            fullWidth
          >
            Volgende
            <ArrowRightIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </main>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
  );
}

function TimeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
