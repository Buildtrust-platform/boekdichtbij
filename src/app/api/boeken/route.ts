import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { createBooking } from "@/lib/db/bookings";
import { TIME_WINDOWS, type TimeWindowId } from "@/lib/timeWindows";
import { BARBER_SERVICES } from "@/lib/barberServices";

interface CreateBookingInput {
  date: string;
  timeWindowId: string;
  serviceType: string;
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidTimeWindowId(id: string): id is TimeWindowId {
  return TIME_WINDOWS.some((tw) => tw.id === id);
}

function isValidServiceType(id: string): boolean {
  return id in BARBER_SERVICES;
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body: CreateBookingInput = await request.json();

    if (!body.date || !isValidDate(body.date)) {
      return NextResponse.json({ error: "Ongeldige datum" }, { status: 400 });
    }

    if (!body.timeWindowId || !isValidTimeWindowId(body.timeWindowId)) {
      return NextResponse.json({ error: "Ongeldig tijdslot" }, { status: 400 });
    }

    if (!body.serviceType || !isValidServiceType(body.serviceType)) {
      return NextResponse.json({ error: "Ongeldige dienst" }, { status: 400 });
    }

    const booking = await createBooking(userId, {
      date: body.date,
      timeWindowId: body.timeWindowId as TimeWindowId,
      serviceType: body.serviceType,
    });

    return NextResponse.json({ bookingId: booking.bookingId }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Boeking maken mislukt" },
      { status: 500 }
    );
  }
}
