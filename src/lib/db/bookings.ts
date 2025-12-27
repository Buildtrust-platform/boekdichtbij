import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME } from "./client";
import type {
  Booking,
  CreateBookingInput,
  BookingStatus,
  UserBooking,
} from "../types/booking";
import { getServicePrice } from "../barberServices";

export async function createBooking(
  userId: string,
  input: CreateBookingInput
): Promise<Booking> {
  const bookingId = ulid();
  const now = new Date().toISOString();
  const amount = getServicePrice(input.serviceType);

  const booking: Booking = {
    bookingId,
    userId,
    date: input.date,
    timeWindowId: input.timeWindowId,
    serviceType: input.serviceType,
    status: "pending",
    amount,
    createdAt: now,
    updatedAt: now,
  };

  // Write BOOKING entity
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: "META",
        GSI1PK: `DATE#${input.date}`,
        GSI1SK: `BOOKING#${input.timeWindowId}#${bookingId}`,
        GSI2PK: "STATUS#pending",
        GSI2SK: `${now}#${bookingId}`,
        entityType: "BOOKING",
        ...booking,
      },
    })
  );

  // Write USER_BOOKING entity for user's list
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `BOOKING#${now}`,
        entityType: "USER_BOOKING",
        bookingId,
        date: input.date,
        timeWindowId: input.timeWindowId,
        serviceType: input.serviceType,
        status: "pending",
      },
    })
  );

  return booking;
}

export async function getBookingById(
  bookingId: string
): Promise<Booking | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "META" },
    })
  );

  if (!result.Item) return null;

  return {
    bookingId: result.Item.bookingId,
    userId: result.Item.userId,
    barberId: result.Item.barberId,
    date: result.Item.date,
    timeWindowId: result.Item.timeWindowId,
    serviceType: result.Item.serviceType,
    status: result.Item.status,
    paymentIntentId: result.Item.paymentIntentId,
    amount: result.Item.amount,
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt,
  };
}

export async function getUserBookings(userId: string): Promise<UserBooking[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "BOOKING#",
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  return (result.Items || []).map((item) => ({
    bookingId: item.bookingId,
    date: item.date,
    timeWindowId: item.timeWindowId,
    serviceType: item.serviceType,
    status: item.status,
    barberId: item.barberId,
    createdAt: item.SK.replace("BOOKING#", ""),
  }));
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "META" },
      UpdateExpression:
        "SET #status = :status, updatedAt = :now, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": status,
        ":now": now,
        ":gsi2pk": `STATUS#${status}`,
        ":gsi2sk": `${now}#${bookingId}`,
      },
    })
  );
}

export async function updateBookingPaymentIntent(
  bookingId: string,
  paymentIntentId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "META" },
      UpdateExpression:
        "SET paymentIntentId = :pi, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk, updatedAt = :now",
      ExpressionAttributeValues: {
        ":pi": paymentIntentId,
        ":gsi3pk": `PI#${paymentIntentId}`,
        ":gsi3sk": "BOOKING",
        ":now": new Date().toISOString(),
      },
    })
  );
}

export async function getBookingByPaymentIntent(
  paymentIntentId: string
): Promise<Booking | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk AND GSI3SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `PI#${paymentIntentId}`,
        ":sk": "BOOKING",
      },
    })
  );

  if (!result.Items || result.Items.length === 0) return null;

  const item = result.Items[0];
  return {
    bookingId: item.bookingId,
    userId: item.userId,
    barberId: item.barberId,
    date: item.date,
    timeWindowId: item.timeWindowId,
    serviceType: item.serviceType,
    status: item.status,
    paymentIntentId: item.paymentIntentId,
    amount: item.amount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getPendingBookings(): Promise<Booking[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "STATUS#dispatched",
      },
    })
  );

  return (result.Items || []).map((item) => ({
    bookingId: item.bookingId,
    userId: item.userId,
    barberId: item.barberId,
    date: item.date,
    timeWindowId: item.timeWindowId,
    serviceType: item.serviceType,
    status: item.status,
    paymentIntentId: item.paymentIntentId,
    amount: item.amount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}
