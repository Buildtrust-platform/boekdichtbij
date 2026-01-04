"use client";

import { useEffect, useState, useCallback } from "react";

interface Provider {
  providerId: string;
  name: string;
  area: string;
  vertical?: string;
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

const AREAS = [
  { value: "", label: "Alle" },
  { value: "ridderkerk", label: "Ridderkerk" },
  { value: "barendrecht", label: "Barendrecht" },
  { value: "zuid", label: "Rotterdam-Zuid" },
  { value: "west", label: "Rotterdam-West" },
  { value: "schiedam", label: "Schiedam" },
  { value: "vlaardingen", label: "Vlaardingen" },
  { value: "capelle", label: "Capelle a/d IJssel" },
  { value: "maassluis", label: "Maassluis" },
  { value: "spijkenisse", label: "Spijkenisse" },
  { value: "hoogvliet", label: "Hoogvliet" },
  { value: "ijsselmonde", label: "IJsselmonde" },
  { value: "krimpen", label: "Krimpen a/d IJssel" },
  { value: "berkel", label: "Berkel en Rodenrijs" },
  { value: "bergschenhoek", label: "Bergschenhoek" },
  { value: "bleiswijk", label: "Bleiswijk" },
];
const VERTICALS = [
  { value: "", label: "Alle" },
  { value: "herenkapper", label: "Herenkapper" },
  { value: "dameskapper", label: "Dameskapper" },
  { value: "schoonmaak", label: "Schoonmaak" },
];
const WA_STATUSES = [
  { value: "", label: "Alle" },
  { value: "VALID", label: "Valid" },
  { value: "UNKNOWN", label: "Unknown" },
  { value: "INVALID", label: "Invalid" },
];
const ACTIVE_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "true", label: "Actief" },
  { value: "false", label: "Inactief" },
];
function formatGenderServices(gs: string[], vertical?: string): string {
  // Schoonmaak doesn't have gender services
  if (vertical === "schoonmaak") return "-";
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
  const [verticalFilter, setVerticalFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [waStatusFilter, setWaStatusFilter] = useState("");

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
      if (verticalFilter) params.set("vertical", verticalFilter);
      if (activeFilter === "true") params.set("activeOnly", "true");
      if (activeFilter === "false") params.set("inactiveOnly", "true");
      if (waStatusFilter) params.set("whatsappStatus", waStatusFilter);

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
  }, [token, areaFilter, verticalFilter, activeFilter, waStatusFilter]);

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


  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Providers</h1>

        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex flex-wrap gap-4 items-center text-sm">
            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Gebied</span>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Dienst</span>
              <select
                value={verticalFilter}
                onChange={(e) => setVerticalFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {VERTICALS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Status</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {ACTIVE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">WhatsApp</span>
              <select
                value={waStatusFilter}
                onChange={(e) => setWaStatusFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {WA_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
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
                  <th className="px-3 py-2 font-medium">Gebied</th>
                  <th className="px-3 py-2 font-medium">Dienst</th>
                  <th className="px-3 py-2 font-medium">WhatsApp</th>
                  <th className="px-3 py-2 font-medium">WA Status</th>
                  <th className="px-3 py-2 font-medium text-center">Actief</th>
                  <th className="px-3 py-2 font-medium">Geslacht</th>
                  <th className="px-3 py-2 font-medium text-center">Score</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.providerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.area}</td>
                    <td className="px-3 py-2 text-gray-500">{p.vertical || "-"}</td>
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
                          <span className="text-gray-700">{formatGenderServices(p.genderServices, p.vertical)}</span>
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
                {providers.length === 0 && (
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
