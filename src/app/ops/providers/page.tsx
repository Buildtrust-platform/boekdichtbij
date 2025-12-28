"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface Provider {
  providerId: string;
  name: string;
  area: string;
  formattedAddress?: string;
  whatsappPhone: string;
  whatsappStatus?: string;
  isActive: boolean;
  hasWebsite: boolean;
  reliabilityScore: number;
  createdAt?: string;
  updatedAt?: string;
}

const AREAS = ["", "ridderkerk", "barendrecht", "rotterdam_zuid"];
const WA_STATUSES = ["", "UNKNOWN", "VALID", "INVALID"];
const WEBSITE_OPTIONS = ["", "true", "false"];

export default function ProvidersPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [areaFilter, setAreaFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [waStatusFilter, setWaStatusFilter] = useState("");
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState("");

  const fetchProviders = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (areaFilter) params.set("area", areaFilter);
      if (activeOnly) params.set("activeOnly", "true");
      if (waStatusFilter) params.set("whatsappStatus", waStatusFilter);
      if (hasWebsiteFilter) params.set("hasWebsite", hasWebsiteFilter);

      const res = await fetch(`/api/admin/providers?${params.toString()}`, {
        headers: { "x-ops-token": token },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError("invalid_token");
        } else {
          setError("fetch_failed");
        }
        return;
      }

      const data = await res.json();
      setProviders(data.providers || []);
    } catch {
      setError("fetch_failed");
    } finally {
      setLoading(false);
    }
  }, [token, areaFilter, activeOnly, waStatusFilter, hasWebsiteFilter]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchProviders();
  }, [token, fetchProviders]);

  const handleTestWhatsApp = async (providerId: string) => {
    if (!token) return;

    setTestingId(providerId);
    setTestError(null);

    try {
      const res = await fetch(`/api/admin/providers/${providerId}/test-whatsapp`, {
        method: "POST",
        headers: { "x-ops-token": token },
      });

      if (!res.ok) {
        setTestError("Probeer opnieuw.");
      }

      await fetchProviders();
    } catch {
      setTestError("Probeer opnieuw.");
    } finally {
      setTestingId(null);
    }
  };

  if (!token || error === "invalid_token") {
    return <p style={{ padding: "2rem" }}>Niet beschikbaar.</p>;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>Providers</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label htmlFor="area" style={{ marginRight: "0.25rem" }}>Area:</label>
          <select
            id="area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            style={{ padding: "0.25rem" }}
          >
            <option value="">All</option>
            {AREAS.filter(Boolean).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="active" style={{ marginRight: "0.25rem" }}>Active only:</label>
          <input
            id="active"
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
        </div>

        <div>
          <label htmlFor="waStatus" style={{ marginRight: "0.25rem" }}>WA status:</label>
          <select
            id="waStatus"
            value={waStatusFilter}
            onChange={(e) => setWaStatusFilter(e.target.value)}
            style={{ padding: "0.25rem" }}
          >
            <option value="">All</option>
            {WA_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="hasWebsite" style={{ marginRight: "0.25rem" }}>Website:</label>
          <select
            id="hasWebsite"
            value={hasWebsiteFilter}
            onChange={(e) => setHasWebsiteFilter(e.target.value)}
            style={{ padding: "0.25rem" }}
          >
            <option value="">All</option>
            {WEBSITE_OPTIONS.filter(Boolean).map((w) => (
              <option key={w} value={w}>{w === "true" ? "Yes" : "No"}</option>
            ))}
          </select>
        </div>
      </div>

      {testError && <p style={{ color: "red", marginBottom: "0.5rem" }}>{testError}</p>}

      {loading && <p>Laden...</p>}

      {error === "fetch_failed" && <p style={{ color: "red" }}>Probeer opnieuw.</p>}

      {!loading && !error && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #333", textAlign: "left" }}>
              <th style={{ padding: "0.5rem" }}>Name</th>
              <th style={{ padding: "0.5rem" }}>Area</th>
              <th style={{ padding: "0.5rem" }}>Adres</th>
              <th style={{ padding: "0.5rem" }}>WhatsApp</th>
              <th style={{ padding: "0.5rem" }}>WA status</th>
              <th style={{ padding: "0.5rem" }}>Active</th>
              <th style={{ padding: "0.5rem" }}>Website</th>
              <th style={{ padding: "0.5rem" }}>Score</th>
              <th style={{ padding: "0.5rem" }}>Test</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.providerId} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "0.5rem" }}>{p.name}</td>
                <td style={{ padding: "0.5rem" }}>{p.area}</td>
                <td style={{ padding: "0.5rem" }}>{p.formattedAddress || "-"}</td>
                <td style={{ padding: "0.5rem" }}>{p.whatsappPhone}</td>
                <td style={{ padding: "0.5rem" }}>{p.whatsappStatus || "UNKNOWN"}</td>
                <td style={{ padding: "0.5rem" }}>{p.isActive ? "Yes" : "No"}</td>
                <td style={{ padding: "0.5rem" }}>{p.hasWebsite ? "Yes" : "No"}</td>
                <td style={{ padding: "0.5rem" }}>{p.reliabilityScore}</td>
                <td style={{ padding: "0.5rem" }}>
                  <button
                    onClick={() => handleTestWhatsApp(p.providerId)}
                    disabled={testingId === p.providerId}
                    style={{
                      padding: "0.25rem 0.5rem",
                      cursor: testingId === p.providerId ? "not-allowed" : "pointer",
                      opacity: testingId === p.providerId ? 0.5 : 1,
                    }}
                  >
                    {testingId === p.providerId ? "..." : "Test WhatsApp"}
                  </button>
                </td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "1rem", textAlign: "center" }}>
                  Geen resultaten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
