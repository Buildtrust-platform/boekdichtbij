"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIME_WINDOWS, DAYS_OF_WEEK } from "@/lib/timeWindows";

export default function BookingDatePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Generate next 14 days
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
    // Convert Sunday (0) to index 6, Monday (1) to index 0, etc.
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return DAYS_OF_WEEK[adjustedIndex].label;
  }

  function handleContinue() {
    if (selectedDate && selectedSlot) {
      router.push(
        `/boeken/dienst?date=${selectedDate}&slot=${selectedSlot}`
      );
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Kies een datum</h1>
        <p className="text-gray-600 mb-6">Stap 1 van 4</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Datum</label>
            <div className="grid grid-cols-2 gap-2">
              {dates.map((date) => {
                const dateStr = formatDate(date);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-3 rounded border text-left ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="font-medium">{getDayLabel(date)}</div>
                    <div className="text-sm opacity-75">
                      {date.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium mb-2">Tijdslot</label>
              <div className="space-y-2">
                {TIME_WINDOWS.map((tw) => {
                  const isSelected = selectedSlot === tw.id;
                  return (
                    <button
                      key={tw.id}
                      onClick={() => setSelectedSlot(tw.id)}
                      className={`w-full p-3 rounded border text-left ${
                        isSelected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {tw.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selectedDate || !selectedSlot}
            className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Volgende
          </button>
        </div>
      </div>
    </main>
  );
}
