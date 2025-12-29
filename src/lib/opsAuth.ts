import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const OPS_TOKEN = process.env.OPS_TOKEN;
const COOKIE_NAME = "ops_session";

/**
 * Check if the user is authenticated for ops pages.
 * Accepts either a valid session cookie or a token query param.
 * Redirects to /ops/login if not authenticated.
 */
export async function requireOpsAuth(tokenParam?: string): Promise<void> {
  // Check query param first (backwards compatible)
  if (tokenParam && OPS_TOKEN && tokenParam === OPS_TOKEN) {
    return;
  }

  // Check session cookie
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);

  if (session?.value && OPS_TOKEN && session.value === OPS_TOKEN) {
    return;
  }

  // Not authenticated
  redirect("/ops/login");
}

/**
 * Check if authenticated without redirecting.
 * Returns true if authenticated, false otherwise.
 */
export async function isOpsAuthenticated(tokenParam?: string): Promise<boolean> {
  if (tokenParam && OPS_TOKEN && tokenParam === OPS_TOKEN) {
    return true;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);

  return !!(session?.value && OPS_TOKEN && session.value === OPS_TOKEN);
}

export type OpsTokenResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Validate ops token from x-ops-token header.
 * For use in API routes (not pages).
 * Returns { ok: true } if valid, or { ok: false, response: 401 } if invalid.
 */
export function requireOpsToken(request: Request): OpsTokenResult {
  const token = request.headers.get("x-ops-token");

  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
