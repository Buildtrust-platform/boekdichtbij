import { NextRequest, NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { requireOpsToken } from "@/lib/opsAuth";

const VALID_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "UNFILLED",
  "REFUNDED",
] as const;

type BookingStatus = (typeof VALID_STATUSES)[number];

interface BookingListItem {
  bookingId: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  serviceName: string;
  timeWindowLabel: string;
  place: string;
  address: string;
  customerName: string;
  phone: string;
  email: string;
  assignedProviderId?: string;
  acceptCode?: string;
  stripeSessionId?: string;
  refundId?: string;
  assignmentDeadline?: string;
}

function isValidStatus(status: string): status is BookingStatus {
  return VALID_STATUSES.includes(status as BookingStatus);
}

export async function GET(request: NextRequest) {
  // Check auth
  const authResult = requireOpsToken(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const areaRaw = searchParams.get("area");
  const statusRaw = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  // Validate required params
  if (!areaRaw || !statusRaw) {
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  }

  // Normalize area: trim and lowercase
  const area = areaRaw.trim().toLowerCase();
  if (!area) {
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  }

  // Validate status against allowed values
  const status = statusRaw.trim().toUpperCase();
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  }

  // Parse and clamp limit
  let limit = 25;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
    }
    limit = Math.min(parsed, 100);
  }

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": `AREA#${area}#STATUS#${status}`,
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    const bookings: BookingListItem[] = (result.Items || []).map((item) => ({
      bookingId: item.bookingId,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      serviceName: item.serviceName,
      timeWindowLabel: item.timeWindowLabel,
      place: item.place,
      address: item.address,
      customerName: item.customerName,
      phone: item.phone,
      email: item.email,
      assignedProviderId: item.assignedProviderId,
      acceptCode: item.acceptCode,
      stripeSessionId: item.stripeSessionId,
      refundId: item.refundId,
      assignmentDeadline: item.assignmentDeadline,
    }));

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("[ops/bookings] Query failed:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
