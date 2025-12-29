"use client";

import { useEffect, useState, useCallback } from "react";

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
  genderServices: string[];
  createdAt?: string;
  updatedAt?: string;
}

const AREAS = ["", "ridderkerk", "barendrecht", "rotterdam_zuid"];
const WA_STATUSES = ["", "UNKNOWN", "VALID", "INVALID"];
const WEBSITE_OPTIONS = ["", "true", "false"];
const SERVICES_OPTIONS = ["", "men", "women", "men,women"];

function formatGenderServices(gs: string[]): string {
  if (gs.includes("men") && gs.includes("women")) return "Heren, Dames";
  if (gs.includes("men")) return "Heren";
  if (gs.includes("women")) return "Dames";
  return "-";
}

interface ProvidersClientProps {
  token: string;
}

export default function ProvidersClient({ token }: ProvidersClientProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [areaFilter, setAreaFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [waStatusFilter, setWaStatusFilter] = useState("");
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState("");
  const [servicesFilter, setServicesFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMen, setEditMen] = useState(false);
  const [editWomen, setEditWomen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProviders = useCallback(async () => {
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
    fetchProviders();
  }, [fetchProviders]);

  const handleTestWhatsApp = async (providerId: string) => {
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

  const handleStartEdit = (provider: Provider) => {
    setEditingId(provider.providerId);
    setEditMen(provider.genderServices.includes("men"));
    setEditWomen(provider.genderServices.includes("women"));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMen(false);
    setEditWomen(false);
  };

  const handleSaveGenderServices = async (providerId: string) => {
    if (!editMen && !editWomen) return;

    setSaving(true);

    try {
      const genderServices: string[] = [];
      if (editMen) genderServices.push("men");
      if (editWomen) genderServices.push("women");

      const res = await fetch(`/api/admin/providers/${providerId}/gender-services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ops-token": token,
        },
        body: JSON.stringify({ genderServices }),
      });

      if (res.ok) {
        await fetchProviders();
        handleCancelEdit();
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  // Client-side filter for services
  const filteredProviders = providers.filter((p) => {
    if (!servicesFilter) return true;
    if (servicesFilter === "men") return p.genderServices.includes("men") && !p.genderServices.includes("women");
    if (servicesFilter === "women") return p.genderServices.includes("women") && !p.genderServices.includes("men");
    if (servicesFilter === "men,women") return p.genderServices.includes("men") && p.genderServices.includes("women");
    return true;
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Providers</h1>

        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex flex-wrap gap-4 items-center text-sm">
            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Area</span>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Alle</option>
                {AREAS.filter(Boolean).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-600">Active only</span>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">WA</span>
              <select
                value={waStatusFilter}
                onChange={(e) => setWaStatusFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Alle</option>
                {WA_STATUSES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Website</span>
              <select
                value={hasWebsiteFilter}
                onChange={(e) => setHasWebsiteFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Alle</option>
                {WEBSITE_OPTIONS.filter(Boolean).map((w) => (
                  <option key={w} value={w}>{w === "true" ? "Ja" : "Nee"}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Services</span>
              <select
                value={servicesFilter}
                onChange={(e) => setServicesFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Alle</option>
                {SERVICES_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s === "men" ? "Heren" : s === "women" ? "Dames" : "Heren+Dames"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {testError && <p className="text-red-600 text-sm mb-3">{testError}</p>}

        {loading && <p className="text-gray-500 text-sm">Laden...</p>}

        {error === "fetch_failed" && (
          <p className="text-red-600 text-sm">Probeer opnieuw.</p>
        )}

        {!loading && !error && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Naam</th>
                  <th className="px-3 py-2 font-medium">Area</th>
                  <th className="px-3 py-2 font-medium">WhatsApp</th>
                  <th className="px-3 py-2 font-medium">WA Status</th>
                  <th className="px-3 py-2 font-medium text-center">Active</th>
                  <th className="px-3 py-2 font-medium text-center">Website</th>
                  <th className="px-3 py-2 font-medium">Services</th>
                  <th className="px-3 py-2 font-medium text-center">Score</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProviders.map((p) => (
                  <tr key={p.providerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.area}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.whatsappPhone}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          p.whatsappStatus === "VALID"
                            ? "bg-green-100 text-green-700"
                            : p.whatsappStatus === "INVALID"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.whatsappStatus || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.isActive ? (
                        <span className="text-green-600">Ja</span>
                      ) : (
                        <span className="text-gray-400">Nee</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.hasWebsite ? (
                        <span className="text-gray-700">Ja</span>
                      ) : (
                        <span className="text-gray-400">Nee</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === p.providerId ? (
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={editMen}
                              onChange={(e) => setEditMen(e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-xs">Heren</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={editWomen}
                              onChange={(e) => setEditWomen(e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-xs">Dames</span>
                          </label>
                          <button
                            onClick={() => handleSaveGenderServices(p.providerId)}
                            disabled={saving || (!editMen && !editWomen)}
                            className="text-xs px-2 py-0.5 bg-gray-900 text-white rounded disabled:opacity-50"
                          >
                            {saving ? "..." : "Opslaan"}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-xs px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            Annuleer
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{formatGenderServices(p.genderServices)}</span>
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="text-xs px-1.5 py-0.5 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            Wijzig
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">
                      {p.reliabilityScore}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleTestWhatsApp(p.providerId)}
                        disabled={testingId === p.providerId}
                        className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        {testingId === p.providerId ? "..." : "Test"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProviders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                      Geen resultaten.
                    </td>
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
