import { NextResponse } from "next/server";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!result.Item) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }

  const item = result.Item;

  return NextResponse.json({
    bookingId: item.bookingId,
    status: item.status,
    serviceName: item.serviceName,
    timeWindowLabel: item.timeWindowLabel,
    address: item.address,
    postcode: item.postcode,
    place: item.place,
    customerName: item.customerName,
    phone: item.phone,
    payoutCents: item.payoutCents,
    assignedProviderId: item.assignedProviderId,
    dispatchStartedAt: item.dispatchStartedAt,
    assignmentDeadline: item.assignmentDeadline,
    acceptedAt: item.acceptedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
}
