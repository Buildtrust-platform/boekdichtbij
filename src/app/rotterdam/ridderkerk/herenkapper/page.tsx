"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

// ==================================================
// HERENKAPPER — STRICT BOOKING MODEL (LOCKED)
// ==================================================
// - Fixed services, fixed prices, fixed time windows
// - Immediate payment required
// - Availability confirmed after payment
// - Dispatched to providers with genderServices: ["men"]
// ==================================================

const SERVICES = [
  { key: "haircut", name: "Knipbeurt", durationMin: 30, priceCents: 3500, payoutCents: 2800 },
  { key: "beard-trim", name: "Baard trimmen", durationMin: 15, priceCents: 2000, payoutCents: 1600 },
  { key: "haircut-beard", name: "Knipbeurt + baard", durationMin: 45, priceCents: 5000, payoutCents: 4000 },
];

const TIME_WINDOWS = [
  { label: "Ochtend (8:00 - 12:00)", start: "08:00", end: "12:00" },
  { label: "Middag (12:00 - 17:00)", start: "12:00", end: "17:00" },
  { label: "Avond (17:00 - 21:00)", start: "17:00", end: "21:00" },
];

export default function HerenkkapperRidderkerkPage() {
  const [serviceKey, setServiceKey] = useState("");
  const [timeWindowIndex, setTimeWindowIndex] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const selectedService = SERVICES.find((s) => s.key === serviceKey);
  const selectedWindow = timeWindowIndex !== null ? TIME_WINDOWS[timeWindowIndex] : null;

  const isFormValid =
    serviceKey &&
    timeWindowIndex !== null &&
    date &&
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

    const windowStart = `${date}T${selectedWindow.start}:00`;
    const windowEnd = `${date}T${selectedWindow.end}:00`;

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
          place: "Ridderkerk",
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          area: "ridderkerk",
          serviceType: "herenkapper",
        }),
      });

      if (!bookingRes.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const bookingData = await bookingRes.json();
      const { bookingId } = bookingData;

      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (!checkoutRes.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        setError(true);
        setLoading(false);
      }
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6 border-b border-gray-100">
        <nav className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <ScissorsIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">BoekDichtbij</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Annuleren
          </Link>
        </nav>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium mb-4">
            <LocationIcon className="w-4 h-4" />
            Ridderkerk
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Herenkapper aan huis
          </h1>
          <p className="text-gray-600 mt-2">
            Professionele knipbeurt bij jou thuis
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
                Kies een dienst
              </h2>
            </div>
            <div className="space-y-3">
              {SERVICES.map((s) => (
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
                Kies een tijdvak
              </h2>
            </div>
            <div className="space-y-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <div className="space-y-3">
                {TIME_WINDOWS.map((tw, i) => (
                  <label
                    key={tw.label}
                    className={`flex items-center gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                      timeWindowIndex === i
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timewindow"
                      value={i}
                      checked={timeWindowIndex === i}
                      onChange={() => setTimeWindowIndex(i)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        timeWindowIndex === i ? "border-primary-500" : "border-gray-300"
                      }`}
                    >
                      {timeWindowIndex === i && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <span className="text-gray-900">{tw.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Step 3: Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                3
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Jouw gegevens
              </h2>
            </div>
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

          {/* Summary and CTA */}
          <section className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            {selectedService && (
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-600">Totaal</span>
                <span className="text-2xl font-bold text-primary-600">
                  €{(selectedService.priceCents / 100).toFixed(0)}
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
                <ErrorIcon className="w-4 h-4 shrink-0" />
                Vul alle velden in en probeer opnieuw.
              </div>
            )}

            {/* LOCKED CTA */}
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              isLoading={loading}
              size="lg"
              fullWidth
            >
              Bevestig en betaal
            </Button>

            {/* LOCKED helper text */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Beschikbaarheid wordt na betaling bevestigd.
            </p>
          </section>
        </form>
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

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
