import type { TimeWindowId } from "../timeWindows";

/**
 * Booking status flow:
 * pending → paid → dispatched → assigned → completed
 */
export type BookingStatus =
  | "pending" // Created, awaiting payment
  | "paid" // Payment received
  | "dispatched" // Sent to barber pool
  | "assigned" // Barber accepted
  | "completed" // Service delivered
  | "cancelled"; // Cancelled by user or system

export interface User {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
}

export interface Barber {
  barberId: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  rating?: number;
  city: string;
  active: boolean;
  createdAt: string;
}

export interface BarberAvailability {
  barberId: string;
  date: string; // YYYY-MM-DD
  slots: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

export interface Booking {
  bookingId: string;
  userId: string;
  barberId?: string; // Assigned after dispatch
  date: string; // YYYY-MM-DD
  timeWindowId: TimeWindowId;
  serviceType: string;
  status: BookingStatus;
  paymentIntentId?: string;
  amount: number; // In cents
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingInput {
  date: string;
  timeWindowId: TimeWindowId;
  serviceType: string;
}

export interface UserBooking {
  bookingId: string;
  date: string;
  timeWindowId: TimeWindowId;
  serviceType: string;
  status: BookingStatus;
  barberId?: string;
  createdAt: string;
}
