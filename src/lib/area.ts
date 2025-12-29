/**
 * Normalize area key to lowercase, trimmed.
 * Used consistently across admin endpoints and booking creation.
 */
export function normalizeArea(area: string): string {
  return area.trim().toLowerCase();
}
