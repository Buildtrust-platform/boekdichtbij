"use client";

import { useState } from "react";

const SERVICES = [
  { key: "haircut", name: "Knipbeurt", durationMin: 30, priceCents: 2500, payoutCents: 2000 },
  { key: "beard-trim", name: "Baard trimmen", durationMin: 15, priceCents: 1500, payoutCents: 1200 },
  { key: "haircut-beard", name: "Knipbeurt + Baard", durationMin: 45, priceCents: 3500, payoutCents: 2800 },
];

const TIME_WINDOWS = [
  { label: "Ochtend (8:00 - 12:00)", start: "08:00", end: "12:00" },
  { label: "Middag (12:00 - 17:00)", start: "12:00", end: "17:00" },
  { label: "Avond (17:00 - 21:00)", start: "17:00", end: "21:00" },
];

export default function KapperRidderkerkPage() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);

    if (
      !serviceKey ||
      timeWindowIndex === null ||
      !date ||
      !customerName.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !address.trim() ||
      !postcode.trim()
    ) {
      setError(true);
      return;
    }

    if (!selectedService || !selectedWindow) {
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
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-6">Kapper Ridderkerk</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Dienst</label>
            <div className="space-y-2">
              {SERVICES.map((s) => (
                <label key={s.key} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="service"
                    value={s.key}
                    checked={serviceKey === s.key}
                    onChange={(e) => setServiceKey(e.target.value)}
                  />
                  <span>{s.name}</span>
                  <span className="text-gray-500 text-sm ml-auto">
                    €{(s.priceCents / 100).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Tijdvak</label>
            <div className="space-y-2">
              {TIME_WINDOWS.map((tw, i) => (
                <label key={tw.label} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="timewindow"
                    value={i}
                    checked={timeWindowIndex === i}
                    onChange={() => setTimeWindowIndex(i)}
                  />
                  <span>{tw.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Naam</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Telefoon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Adres</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Postcode</label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {error && <p className="text-red-600 text-sm">Probeer opnieuw.</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded disabled:opacity-50"
          >
            {loading ? "Laden..." : "Bevestig en betaal"}
          </button>
        </form>
      </div>
    </main>
  );
}
