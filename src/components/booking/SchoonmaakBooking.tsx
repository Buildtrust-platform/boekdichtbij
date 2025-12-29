"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { getAreaDbKey } from "@/config/locations";
import { COPY } from "@/lib/copy";

// ==================================================
// SCHOONMAAK — STRICT BOOKING MODEL
// ==================================================
// - Services loaded dynamically from service config
// - Fixed prices per service
// - Immediate payment required
// - Dispatched to cleaning providers in the area
// ==================================================

interface ServiceOption {
  key: string;
  name: string;
  durationMin: number;
  priceCents: number;
  payoutCents: number;
}

// Helper to get Amsterdam timezone date string (YYYY-MM-DD)
function getAmsterdamDate(daysFromNow: number): string {
  const now = new Date();
  const amsterdam = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  amsterdam.setDate(amsterdam.getDate() + daysFromNow);
  return amsterdam.toISOString().split("T")[0];
}

// Helper to create ISO timestamp in Amsterdam timezone
function toAmsterdamISO(dateStr: string, time: string): string {
  const dateTime = new Date(`${dateStr}T${time}:00`);
  const amsterdamStr = dateTime.toLocaleString("en-US", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = amsterdamStr.match(/(\d+)\/(\d+)\/(\d+),? (\d+):(\d+):(\d+)/);
  if (!parts) return `${dateStr}T${time}:00+01:00`;
  const [, month, day, year, hour, minute, second] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour}:${minute}:${second}+01:00`;
}

interface TimeWindow {
  key: string;
  label: string;
  dateStr: string;
  startTime: string;
  endTime: string;
}

interface SchoonmaakBookingProps {
  citySlug: string;
  areaSlug: string;
  areaLabel: string;
  serviceSlug: string;
}

// Service display names
const SERVICE_NAMES: Record<string, string> = {
  "schoonmaak-basis": "Basisschoonmaak",
  "ramen-binnen": "Ramen binnenkant",
  "schoonmaak-groot": "Grote schoonmaak",
  "eindschoonmaak": "Eindschoonmaak",
};

export default function SchoonmaakBooking({
  areaSlug,
  areaLabel,
}: SchoonmaakBookingProps) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(false);

  const [serviceKey, setServiceKey] = useState("");
  const [timeWindowKey, setTimeWindowKey] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Load enabled services for this area
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch(`/api/services?area=${encodeURIComponent(areaSlug)}&vertical=schoonmaak`);
        if (!res.ok) {
          setServicesError(true);
          return;
        }
        const data = await res.json();
        const loadedServices: ServiceOption[] = (data.services || []).map((s: {
          serviceKey: string;
          priceCents: number;
          payoutCents: number;
          durationMinutes: number;
        }) => ({
          key: s.serviceKey,
          name: SERVICE_NAMES[s.serviceKey] || s.serviceKey,
          durationMin: s.durationMinutes,
          priceCents: s.priceCents,
          payoutCents: s.payoutCents,
        }));
        setServices(loadedServices);
      } catch {
        setServicesError(true);
      } finally {
        setServicesLoading(false);
      }
    }
    loadServices();
  }, [areaSlug]);

  // Build time windows dynamically - cleaning has larger windows
  const timeWindows: TimeWindow[] = useMemo(() => {
    const tomorrow = getAmsterdamDate(1);
    const dayAfter = getAmsterdamDate(2);
    return [
      { key: "tomorrow-0900", label: "Morgen 09:00 - 12:00", dateStr: tomorrow, startTime: "09:00", endTime: "12:00" },
      { key: "tomorrow-1300", label: "Morgen 13:00 - 16:00", dateStr: tomorrow, startTime: "13:00", endTime: "16:00" },
      { key: "dayafter-0900", label: "Overmorgen 09:00 - 12:00", dateStr: dayAfter, startTime: "09:00", endTime: "12:00" },
      { key: "dayafter-1300", label: "Overmorgen 13:00 - 16:00", dateStr: dayAfter, startTime: "13:00", endTime: "16:00" },
    ];
  }, []);

  const selectedService = services.find((s) => s.key === serviceKey);
  const selectedWindow = timeWindows.find((tw) => tw.key === timeWindowKey);

  const isFormValid =
    serviceKey &&
    timeWindowKey !== null &&
    customerName.trim() &&
    phone.trim() &&
    email.trim() &&
    address.trim() &&
    postcode.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);

    if (!isFormValid || !selectedService || !selectedWindow) {
      setError(true);
      return;
    }

    const windowStart = toAmsterdamISO(selectedWindow.dateStr, selectedWindow.startTime);
    const windowEnd = toAmsterdamISO(selectedWindow.dateStr, selectedWindow.endTime);

    setLoading(true);

    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceKey: selectedService.key,
          serviceName: selectedService.name,
          durationMin: selectedService.durationMin,
          priceCents: selectedService.priceCents,
          payoutCents: selectedService.payoutCents,
          timeWindowLabel: selectedWindow.label,
          windowStart,
          windowEnd,
          address: address.trim(),
          postcode: postcode.trim(),
          place: areaLabel,
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          area: getAreaDbKey(areaSlug),
          serviceType: "schoonmaak",
          vertical: "schoonmaak",
        }),
      });

      if (!bookingRes.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const bookingData = await bookingRes.json();

      // Create Stripe checkout session and redirect
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: bookingData.bookingId }),
      });

      if (!checkoutRes.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const checkoutData = await checkoutRes.json();
      window.location.href = checkoutData.checkoutUrl;
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  if (servicesLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </main>
    );
  }

  if (servicesError || services.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
        <header className="px-4 py-4 sm:px-6 border-b border-gray-100">
          <nav className="max-w-lg mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <CleaningIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">{COPY.booking.headerLabel}</span>
            </Link>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              {COPY.actions.cancel}
            </Link>
          </nav>
        </header>
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Schoonmaakdiensten nog niet beschikbaar</h1>
          <p className="text-gray-600">
            Schoonmaakdiensten zijn nog niet beschikbaar in {areaLabel}. Probeer het later opnieuw.
          </p>
          <Link href="/" className="inline-block mt-6 text-primary-600 hover:text-primary-700 font-medium">
            Terug naar home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6 border-b border-gray-100">
        <nav className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <CleaningIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">{COPY.booking.headerLabel}</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            {COPY.actions.cancel}
          </Link>
        </nav>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Schoonmaak aan huis in {areaLabel}
          </h1>
          <p className="text-gray-600 mt-2">
            Professionele schoonmaak bij u thuis. Betaal vooraf, wij regelen de rest.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Service */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                1
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {COPY.booking.chooseService}
              </h2>
            </div>
            <div className="space-y-3">
              {services.map((s) => (
                <label
                  key={s.key}
                  className={`flex items-center justify-between p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                    serviceKey === s.key
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="service"
                      value={s.key}
                      checked={serviceKey === s.key}
                      onChange={(e) => setServiceKey(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        serviceKey === s.key ? "border-primary-500" : "border-gray-300"
                      }`}
                    >
                      {serviceKey === s.key && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{s.name}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        ±{s.durationMin} min
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-primary-600">
                    €{(s.priceCents / 100).toFixed(0)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Step 2: Time */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                2
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {COPY.booking.chooseTime}
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">De schoonmaker komt binnen het gekozen tijdvak.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {timeWindows.map((tw) => (
                <label
                  key={tw.key}
                  className={`flex items-center justify-center p-4 bg-white border-2 rounded-xl cursor-pointer transition-all text-center ${
                    timeWindowKey === tw.key
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="timewindow"
                    value={tw.key}
                    checked={timeWindowKey === tw.key}
                    onChange={() => setTimeWindowKey(tw.key)}
                    className="sr-only"
                  />
                  <span className={`font-medium ${timeWindowKey === tw.key ? "text-primary-700" : "text-gray-900"}`}>
                    {tw.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Step 3: Location */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                3
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {COPY.booking.location}
              </h2>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adres"
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Postcode"
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </section>

          {/* Step 4: Details */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                4
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {COPY.booking.details}
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">{COPY.booking.detailsNote}</p>
            <div className="space-y-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Naam"
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefoon"
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </section>

          {/* Summary and CTA */}
          <section className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{COPY.booking.summary}</h3>
            {selectedService && (
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-600">{selectedService.name}</span>
                <span className="text-2xl font-bold text-primary-600">
                  €{(selectedService.priceCents / 100).toFixed(0)}
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
                <ErrorIcon className="w-4 h-4 shrink-0" />
                {COPY.booking.genericError}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !isFormValid}
              isLoading={loading}
              size="lg"
              fullWidth
            >
              {COPY.booking.cta}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-4">
              {COPY.booking.ctaSubtext}
            </p>

            <p className="text-center text-xs text-gray-400 mt-2">
              {COPY.booking.guarantee}
            </p>
          </section>
        </form>
      </div>
    </main>
  );
}

function CleaningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
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
