"use client";

import { useState } from "react";

export default function OpsLoginPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!token.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ops/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (res.ok) {
        window.location.href = "/ops";
      } else {
        setError("Ongeldige token");
      }
    } catch {
      setError("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-6 text-center">
          Ops Login
        </h1>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-sm text-gray-600 mb-1">Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
            placeholder="Voer token in..."
            autoFocus
          />

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !token.trim()}
            className="w-full bg-gray-900 text-white py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Laden..." : "Inloggen"}
          </button>
        </div>
      </div>
    </main>
  );
}
