"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

// ==================================================
// DAMESKAPPER — FLEXIBLE BOOKING MODEL (LOCKED)
// ==================================================
// - Intent-based service selection (no fixed time/price)
// - "Vanaf €X" pricing (final price confirmed by provider)
// - Customer submits preference, provider confirms details
// - Dispatched to providers with genderServices: ["women"]
// ==================================================

const SERVICE_INTENTS = [
  { key: "knippen", name: "Knippen", fromPriceCents: 4500 },
  { key: "knippen-fohnen", name: "Knippen + föhnen", fromPriceCents: 5500 },
  { key: "kleuren", name: "Kleuren", fromPriceCents: 7500 },
  { key: "styling", name: "Styling", fromPriceCents: 3500 },
];

export default function DameskapperRidderkerkPage() {
  const [intentKey, setIntentKey] = useState("");
  const [datePreference, setDatePreference] = useState("");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const selectedIntent = SERVICE_INTENTS.find((s) => s.key === intentKey);

  const isFormValid =
    intentKey &&
    datePreference &&
    customerName.trim() &&
    phone.trim() &&
    email.trim() &&
    address.trim() &&
    postcode.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);

    if (!isFormValid || !selectedIntent) {
      setError(true);
      return;
    }

    setLoading(true);

    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceKey: selectedIntent.key,
          serviceName: selectedIntent.name,
          fromPriceCents: selectedIntent.fromPriceCents,
          datePreference,
          notes: notes.trim(),
          address: address.trim(),
          postcode: postcode.trim(),
          place: "Ridderkerk",
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          area: "ridderkerk",
          serviceType: "dameskapper",
          bookingModel: "flexible",
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
            Dameskapper aan huis
          </h1>
          <p className="text-gray-600 mt-2">
            Professionele haarverzorging bij jou thuis
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
              {SERVICE_INTENTS.map((s) => (
                <label
                  key={s.key}
                  className={`flex items-center justify-between p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                    intentKey === s.key
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="intent"
                      value={s.key}
                      checked={intentKey === s.key}
                      onChange={(e) => setIntentKey(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        intentKey === s.key ? "border-primary-500" : "border-gray-300"
                      }`}
                    >
                      {intentKey === s.key && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{s.name}</span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    Vanaf €{(s.fromPriceCents / 100).toFixed(0)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Step 2: Date */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                2
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Kies een datum
              </h2>
            </div>
            <div className="space-y-3">
              <input
                type="date"
                value={datePreference}
                onChange={(e) => setDatePreference(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-sm text-gray-500">
                De kapper neemt contact op om een exacte tijd af te spreken.
              </p>
            </div>
          </section>

          {/* Step 3: Notes */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                3
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Aanvullende wensen
              </h2>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bijv. haarlengte, kleurwensen, allergieën... (optioneel)"
              rows={3}
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors resize-none"
            />
          </section>

          {/* Step 4: Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                4
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
            {selectedIntent && (
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-600">Indicatie</span>
                <span className="text-2xl font-bold text-primary-600">
                  Vanaf €{(selectedIntent.fromPriceCents / 100).toFixed(0)}
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
              Aanvraag indienen
            </Button>

            {/* LOCKED helper text */}
            <p className="text-center text-sm text-gray-500 mt-4">
              De kapper bevestigt prijs en tijd na acceptatie.
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
