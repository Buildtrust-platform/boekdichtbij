"use client";

import { useEffect, useState, useCallback } from "react";

interface AreaCounts {
  totalProviders: number;
  activeProviders: number;
  whatsappValid: number;
  menActiveValid: number;
  womenActiveValid: number;
}

interface AreaReadiness {
  herenkapperReady: boolean;
  dameskapperReady: boolean;
  recommendedStatus: "hidden" | "pilot" | "live";
}

interface AreaHealth {
  areaKey: string;
  city: string;
  label: string;
  rolloutStatusDefault: "hidden" | "pilot" | "live";
  rolloutStatusEffective: "hidden" | "pilot" | "live";
  neighbors: string[];
  counts: AreaCounts;
  readiness: AreaReadiness;
}

interface HealthResponse {
  ok: boolean;
  generatedAt: string;
  areas: AreaHealth[];
}

interface AreasClientProps {
  token: string;
}

type RolloutStatus = "hidden" | "pilot" | "live";

function formatReadiness(readiness: AreaReadiness): string {
  if (readiness.herenkapperReady && readiness.dameskapperReady) {
    return "Heren + Dames";
  }
  if (readiness.herenkapperReady) {
    return "Heren";
  }
  if (readiness.dameskapperReady) {
    return "Dames";
  }
  return "—";
}

function StatusBadge({ status }: { status: RolloutStatus }) {
  const styles = {
    hidden: "bg-gray-100 text-gray-600",
    pilot: "bg-yellow-100 text-yellow-700",
    live: "bg-green-100 text-green-700",
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

interface RolloutSwitchProps {
  city: string;
  areaKey: string;
  currentStatus: RolloutStatus;
  token: string;
  onSaved: () => void;
}

function RolloutSwitch({
  city,
  areaKey,
  currentStatus,
  token,
  onSaved,
}: RolloutSwitchProps) {
  const [selected, setSelected] = useState<RolloutStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const hasChanged = selected !== currentStatus;

  async function handleSave() {
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/areas/${city}/${areaKey}/rollout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ops-token": token,
        },
        body: JSON.stringify({ rolloutStatus: selected }),
      });

      if (res.ok) {
        setResult("success");
        onSaved();
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setSaving(false);
    }
  }

  // Clear result after 2 seconds
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setResult(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as RolloutStatus)}
        disabled={saving}
        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
      >
        <option value="hidden">hidden</option>
        <option value="pilot">pilot</option>
        <option value="live">live</option>
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={!hasChanged || saving}
        className={`text-xs px-2 py-1 rounded ${
          hasChanged && !saving
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {saving ? "..." : "Opslaan"}
      </button>
      {result === "success" && (
        <span className="text-xs text-green-600">Opgeslagen</span>
      )}
      {result === "error" && (
        <span className="text-xs text-red-600">Mislukt</span>
      )}
    </div>
  );
}

export default function AreasClient({ token }: AreasClientProps) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/areas/health", {
        headers: { "x-ops-token": token },
        cache: "no-store",
      });

      if (!res.ok) {
        setError("fetch_failed");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch {
      setError("fetch_failed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-500 text-sm">Laden...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600 text-sm">Fout bij laden.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Areas</h1>

        {data && (
          <>
            <p className="text-xs text-gray-400 mb-4">
              Generated: {new Date(data.generatedAt).toLocaleString("nl-NL")}
            </p>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
                    <th className="px-3 py-2 font-medium">Area</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Providers</th>
                    <th className="px-3 py-2 font-medium text-right">Active</th>
                    <th className="px-3 py-2 font-medium text-right">WA valid</th>
                    <th className="px-3 py-2 font-medium text-right">Men valid</th>
                    <th className="px-3 py-2 font-medium text-right">Women valid</th>
                    <th className="px-3 py-2 font-medium">Ready</th>
                    <th className="px-3 py-2 font-medium">Wijzig status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.areas.map((area) => (
                    <tr
                      key={area.areaKey}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2">
                        <div>
                          <span className="text-gray-900">{area.label}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {area.areaKey}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={area.rolloutStatusEffective} />
                          {area.rolloutStatusEffective !== area.rolloutStatusDefault && (
                            <span className="text-xs text-gray-400">
                              (default: {area.rolloutStatusDefault})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {area.counts.totalProviders}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {area.counts.activeProviders}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {area.counts.whatsappValid}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {area.counts.menActiveValid}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {area.counts.womenActiveValid}
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <span
                            className={
                              area.readiness.herenkapperReady ||
                              area.readiness.dameskapperReady
                                ? "text-green-700"
                                : "text-gray-400"
                            }
                          >
                            {formatReadiness(area.readiness)}
                          </span>
                          <div className="text-xs text-gray-400">
                            Recommended: {area.readiness.recommendedStatus}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <RolloutSwitch
                          city={area.city}
                          areaKey={area.areaKey}
                          currentStatus={area.rolloutStatusEffective}
                          token={token}
                          onSaved={fetchHealth}
                        />
                      </td>
                    </tr>
                  ))}
                  {data.areas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                        Geen areas gevonden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
