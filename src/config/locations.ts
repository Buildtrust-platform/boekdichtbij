// ==================================================
// LOCATION REGISTRIES — SINGLE SOURCE OF TRUTH
// ==================================================

export interface CityConfig {
  label: string;
  enabled: boolean;
  country: "NL";
  currency: "EUR";
}

export interface AreaConfig {
  city: string;
  label: string;
  enabled: boolean;
  neighbors: string[];
  rolloutStatus: "hidden" | "pilot" | "live";
}

export interface ServiceConfig {
  label: string;
  enabled: boolean;
  model: "strict" | "flexible";
  requiredGender: "men" | "women";
  slug: string;
}

// ==================================================
// CITIES
// ==================================================
export const CITIES: Record<string, CityConfig> = {
  rotterdam: {
    label: "Rotterdam",
    enabled: true,
    country: "NL",
    currency: "EUR",
  },
};

// ==================================================
// AREAS
// Key = URL slug (what appears in the URL path)
// ==================================================
export const AREAS: Record<string, AreaConfig> = {
  ridderkerk: {
    city: "rotterdam",
    label: "Ridderkerk",
    enabled: true,
    neighbors: ["barendrecht", "zuid"],
    rolloutStatus: "live",
  },
  barendrecht: {
    city: "rotterdam",
    label: "Barendrecht",
    enabled: true,
    neighbors: ["ridderkerk", "zuid"],
    rolloutStatus: "live",
  },
  zuid: {
    city: "rotterdam",
    label: "Rotterdam-Zuid",
    enabled: true,
    neighbors: ["ridderkerk", "barendrecht", "schiedam"],
    rolloutStatus: "live",
  },
  schiedam: {
    city: "rotterdam",
    label: "Schiedam",
    enabled: true,
    neighbors: ["zuid", "vlaardingen"],
    rolloutStatus: "live",
  },
  vlaardingen: {
    city: "rotterdam",
    label: "Vlaardingen",
    enabled: true,
    neighbors: ["schiedam"],
    rolloutStatus: "live",
  },
  west: {
    city: "rotterdam",
    label: "Rotterdam-West",
    enabled: true,
    neighbors: ["schiedam", "centrum"],
    rolloutStatus: "live",
  },
  capelle: {
    city: "rotterdam",
    label: "Capelle aan den IJssel",
    enabled: true,
    neighbors: ["zuid", "krimpen"],
    rolloutStatus: "live",
  },
  // New areas within 15km radius
  maassluis: {
    city: "rotterdam",
    label: "Maassluis",
    enabled: true,
    neighbors: ["vlaardingen", "hoekvanholland"],
    rolloutStatus: "live",
  },
  spijkenisse: {
    city: "rotterdam",
    label: "Spijkenisse",
    enabled: true,
    neighbors: ["hoogvliet", "zuid"],
    rolloutStatus: "live",
  },
  hoogvliet: {
    city: "rotterdam",
    label: "Hoogvliet",
    enabled: true,
    neighbors: ["spijkenisse", "zuid"],
    rolloutStatus: "live",
  },
  ijsselmonde: {
    city: "rotterdam",
    label: "IJsselmonde",
    enabled: true,
    neighbors: ["zuid", "barendrecht", "ridderkerk"],
    rolloutStatus: "live",
  },
  krimpen: {
    city: "rotterdam",
    label: "Krimpen aan den IJssel",
    enabled: true,
    neighbors: ["capelle", "ridderkerk"],
    rolloutStatus: "live",
  },
  berkel: {
    city: "rotterdam",
    label: "Berkel en Rodenrijs",
    enabled: true,
    neighbors: ["bergschenhoek", "schiedam"],
    rolloutStatus: "live",
  },
  bergschenhoek: {
    city: "rotterdam",
    label: "Bergschenhoek",
    enabled: true,
    neighbors: ["berkel", "bleiswijk"],
    rolloutStatus: "live",
  },
  bleiswijk: {
    city: "rotterdam",
    label: "Bleiswijk",
    enabled: true,
    neighbors: ["bergschenhoek", "capelle"],
    rolloutStatus: "live",
  },
};

// ==================================================
// SERVICES
// ==================================================
export const SERVICES: Record<string, ServiceConfig> = {
  herenkapper: {
    label: "Herenkapper",
    enabled: true,
    model: "strict",
    requiredGender: "men",
    slug: "herenkapper",
  },
  dameskapper: {
    label: "Dameskapper",
    enabled: true,
    model: "flexible",
    requiredGender: "women",
    slug: "dameskapper",
  },
};

// ==================================================
// HELPER FUNCTIONS
// ==================================================

export function isValidCity(city: string): boolean {
  const cityConfig = CITIES[city];
  return !!cityConfig && cityConfig.enabled;
}

export function isValidArea(city: string, area: string): boolean {
  const areaConfig = AREAS[area];
  if (!areaConfig) return false;
  if (!areaConfig.enabled) return false;
  if (areaConfig.city !== city) return false;
  if (areaConfig.rolloutStatus === "hidden") return false;
  return true;
}

export function isValidService(service: string): boolean {
  const serviceConfig = SERVICES[service];
  return !!serviceConfig && serviceConfig.enabled;
}

export function getAreaKey(city: string, area: string): string | null {
  if (!isValidArea(city, area)) return null;
  return area;
}

export function getServiceConfig(service: string): ServiceConfig | null {
  const config = SERVICES[service];
  if (!config || !config.enabled) return null;
  return config;
}

export function getAreaConfig(areaKey: string): AreaConfig | null {
  const config = AREAS[areaKey];
  if (!config || !config.enabled) return null;
  return config;
}

export function getCityConfig(city: string): CityConfig | null {
  const config = CITIES[city];
  if (!config || !config.enabled) return null;
  return config;
}

// Convert area slug to internal key (handles URL slugs like "rotterdam-zuid")
export function normalizeAreaSlug(slug: string): string {
  return slug.toLowerCase();
}

// Get area key for DynamoDB (converts URL slug to DB key format)
// e.g., "rotterdam-zuid" -> "rotterdam_zuid" for DB queries
export function getAreaDbKey(areaSlug: string): string {
  return areaSlug.replace(/-/g, "_");
}
