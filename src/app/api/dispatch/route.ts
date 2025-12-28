import { NextResponse } from "next/server";
import { dispatchWave1 } from "@/lib/dispatchWave1";

export async function POST(request: Request) {
  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { bookingId } = body;
  if (!bookingId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await dispatchWave1(bookingId);

  if (result.skipped) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.reason === "status_not_pending_assignment") {
      return NextResponse.json({ error: "status_conflict" }, { status: 409 });
    }
    if (result.reason === "already_dispatched") {
      return NextResponse.json({ error: "already_dispatched" }, { status: 409 });
    }
  }

  return NextResponse.json({
    dispatched: result.dispatched,
    wave: result.wave,
    providersNotified: result.providersNotified,
  });
}
