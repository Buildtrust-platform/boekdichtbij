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

  return NextResponse.json(result);
}
