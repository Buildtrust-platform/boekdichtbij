import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const OPS_TOKEN = process.env.OPS_TOKEN;
const COOKIE_NAME = "ops_session";
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { token } = body;

  if (!token || !OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, OPS_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/ops",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
