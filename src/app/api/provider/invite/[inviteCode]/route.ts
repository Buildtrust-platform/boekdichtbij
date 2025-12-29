import { NextResponse } from "next/server";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

interface RouteContext {
  params: Promise<{ inviteCode: string }>;
}

/**
 * GET /api/provider/invite/[inviteCode]
 *
 * Returns invite data for pre-filling the claim form.
 * Only returns non-sensitive data (providerId, phone).
 */
export async function GET(
  request: Request,
  context: RouteContext
) {
  const { inviteCode } = await context.params;

  if (!inviteCode) {
    return NextResponse.json({ error: "invite_code_required" }, { status: 400 });
  }

  // Load invite
  const inviteResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `INVITE#${inviteCode}`, SK: "INVITE" },
    })
  );

  if (!inviteResult.Item) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  const invite = inviteResult.Item;
  const providerId = invite.providerId as string;

  // Load provider to get phone
  const providerResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PROVIDER#${providerId}`, SK: "PROFILE" },
    })
  );

  const provider = providerResult.Item;

  // Return minimal data for form pre-fill
  return NextResponse.json({
    providerId,
    phone: provider?.whatsappPhone || provider?.phone || null,
  });
}
