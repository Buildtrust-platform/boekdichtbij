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
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Ops</h1>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <label className="block text-sm text-gray-600 mb-1">Booking ID</label>
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-gray-400"
            placeholder="01KDFN..."
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Status
          </button>
          <button
            onClick={callAssignable}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Betaald
          </button>
          <button
            onClick={callDispatch}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Dispatch
          </button>
          <button
            onClick={callExpire}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Expire
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">Fout opgetreden</p>}
        {message && <p className="text-gray-600 text-sm mb-3">{message}</p>}

        {booking && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-500 w-40">status</td>
                  <td className="px-3 py-2 font-medium">{booking.status}</td>
                </tr>
                {booking.serviceName && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">serviceName</td>
                    <td className="px-3 py-2">{booking.serviceName}</td>
                  </tr>
                )}
                {booking.timeWindowLabel && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">timeWindowLabel</td>
                    <td className="px-3 py-2">{booking.timeWindowLabel}</td>
                  </tr>
                )}
                {(booking.address || booking.postcode || booking.place) && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">adres</td>
                    <td className="px-3 py-2">
                      {[booking.address, booking.postcode, booking.place].filter(Boolean).join(", ")}
                    </td>
                  </tr>
                )}
                {booking.assignedProviderId && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">assignedProviderId</td>
                    <td className="px-3 py-2 font-mono text-xs">{booking.assignedProviderId}</td>
                  </tr>
                )}
                {booking.dispatchStartedAt && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">dispatchStartedAt</td>
                    <td className="px-3 py-2 font-mono text-xs">{booking.dispatchStartedAt}</td>
                  </tr>
                )}
                {booking.assignmentDeadline && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">assignmentDeadline</td>
                    <td className="px-3 py-2 font-mono text-xs">{booking.assignmentDeadline}</td>
                  </tr>
                )}
                {booking.acceptedAt && (
                  <tr>
                    <td className="px-3 py-2 text-gray-500">acceptedAt</td>
                    <td className="px-3 py-2 font-mono text-xs">{booking.acceptedAt}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
