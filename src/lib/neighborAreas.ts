import { AREAS } from "@/config/locations";
import { getAreaOverride } from "./areaOverrides";

export interface EffectiveAreaConfig {
  enabled: boolean;
  rolloutStatus: "hidden" | "pilot" | "live";
}

/**
 * Get effective area configuration with DynamoDB overrides applied.
 * Falls back to registry defaults if override fetch fails.
 */
export async function getEffectiveAreaConfig(
  city: string,
  areaKey: string
): Promise<EffectiveAreaConfig> {
  const registryConfig = AREAS[areaKey];

  // Default if area not in registry
  if (!registryConfig) {
    return { enabled: false, rolloutStatus: "hidden" };
  }

  // Start with registry defaults
  let enabled = registryConfig.enabled;
  let rolloutStatus = registryConfig.rolloutStatus;

  // Apply overrides
  try {
    const override = await getAreaOverride(city, areaKey);
    if (override) {
      if (override.rolloutStatus !== undefined) {
        rolloutStatus = override.rolloutStatus;
      }
      if (override.enabled !== undefined) {
        enabled = override.enabled;
      }
    }
  } catch {
    // Fallback to registry on error
  }

  return { enabled, rolloutStatus };
}

/**
 * Get Wave 3 neighbor areas for spillover dispatch.
 * Returns neighbor areaKeys in priority order, filtered to those that are:
 * - enabled == true
 * - rolloutStatus != "hidden"
 */
export async function getWave3Areas(
  city: string,
  areaKey: string
): Promise<string[]> {
  const registryConfig = AREAS[areaKey];

  // No neighbors if area not in registry
  if (!registryConfig || !registryConfig.neighbors) {
    return [];
  }

  const eligibleNeighbors: string[] = [];

  for (const neighborKey of registryConfig.neighbors) {
    const neighborConfig = await getEffectiveAreaConfig(city, neighborKey);

    if (neighborConfig.enabled && neighborConfig.rolloutStatus !== "hidden") {
      eligibleNeighbors.push(neighborKey);
    }
  }

  return eligibleNeighbors;
}
