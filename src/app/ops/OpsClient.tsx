"use client";

import { useState } from "react";

interface BookingData {
  bookingId: string;
  status: string;
  serviceName?: string;
  timeWindowLabel?: string;
  address?: string;
  postcode?: string;
  place?: string;
  assignedProviderId?: string;
  dispatchStartedAt?: string;
  assignmentDeadline?: string;
  acceptedAt?: string;
}

export default function OpsClient() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchStatus() {
    if (!bookingId.trim()) return;
    setError(false);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
      if (!res.ok) {
        setError(true);
        setBooking(null);
      } else {
        const data = await res.json();
        setBooking(data);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function callAssignable() {
    if (!bookingId.trim()) return;
    setError(false);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/assignable`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(true);
      } else {
        const data = await res.json();
        setMessage(`assignable: ${data.status || "ok"}`);
        await fetchStatus();
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function callDispatch() {
    if (!bookingId.trim()) return;
    setError(false);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
        cache: "no-store",
      });
      if (!res.ok) {
        setError(true);
      } else {
        const data = await res.json();
        setMessage(`dispatch: ${data.providersNotified || 0} providers`);
        await fetchStatus();
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function callExpire() {
    if (!bookingId.trim()) return;
    setError(false);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/expire`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(true);
      } else {
        const data = await res.json();
        setMessage(`expire: ${data.status || "ok"}`);
        await fetchStatus();
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-6">Ops</h1>

        <div className="mb-4">
          <label className="block text-sm mb-2">Booking ID</label>
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            placeholder="01KDFN..."
          />
        </div>

        <div className="space-y-2 mb-6">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="w-full border rounded py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Status ophalen
          </button>
          <button
            onClick={callAssignable}
            disabled={loading}
            className="w-full border rounded py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Markeer als betaalde boeking
          </button>
          <button
            onClick={callDispatch}
            disabled={loading}
            className="w-full border rounded py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Verstuur naar providers
          </button>
          <button
            onClick={callExpire}
            disabled={loading}
            className="w-full border rounded py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Forceer verlopen
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">Probeer opnieuw.</p>}
        {message && <p className="text-gray-600 text-sm mb-4">{message}</p>}

        {booking && (
          <div className="border rounded p-4 text-sm space-y-1">
            <p><span className="text-gray-500">status:</span> {booking.status}</p>
            {booking.serviceName && (
              <p><span className="text-gray-500">serviceName:</span> {booking.serviceName}</p>
            )}
            {booking.timeWindowLabel && (
              <p><span className="text-gray-500">timeWindowLabel:</span> {booking.timeWindowLabel}</p>
            )}
            {(booking.address || booking.postcode || booking.place) && (
              <p>
                <span className="text-gray-500">adres:</span>{" "}
                {[booking.address, booking.postcode, booking.place].filter(Boolean).join(", ")}
              </p>
            )}
            {booking.assignedProviderId && (
              <p><span className="text-gray-500">assignedProviderId:</span> {booking.assignedProviderId}</p>
            )}
            {booking.dispatchStartedAt && (
              <p><span className="text-gray-500">dispatchStartedAt:</span> {booking.dispatchStartedAt}</p>
            )}
            {booking.assignmentDeadline && (
              <p><span className="text-gray-500">assignmentDeadline:</span> {booking.assignmentDeadline}</p>
            )}
            {booking.acceptedAt && (
              <p><span className="text-gray-500">acceptedAt:</span> {booking.acceptedAt}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
