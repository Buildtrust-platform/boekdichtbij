import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

interface ClaimRequest {
  inviteCode: string;
  payoutType: "percentage" | "fixed";
  payoutValue: number;
  isActive: boolean;
  whatsappPhone: string;
}

/**
 * Validate E.164 phone format: +[country][number], 10-17 chars total
 */
function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{8,15}$/.test(phone);
}

function invertedScore(score: number): string {
  const inverted = 9999 - score;
  return String(inverted).padStart(4, "0");
}

export async function POST(request: Request) {
  let body: ClaimRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { inviteCode, payoutType, payoutValue, isActive, whatsappPhone } = body;

  if (!inviteCode) {
    return NextResponse.json({ error: "invite_code_required" }, { status: 400 });
  }

  // Validate whatsappPhone
  const trimmedPhone = whatsappPhone?.trim();
  if (!trimmedPhone) {
    return NextResponse.json({ error: "phone_required" }, { status: 400 });
  }

  if (!isValidE164(trimmedPhone)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  if (!payoutType || !["percentage", "fixed"].includes(payoutType)) {
    return NextResponse.json({ error: "invalid_payout_type" }, { status: 400 });
  }

  if (typeof payoutValue !== "number" || payoutValue < 0) {
    return NextResponse.json({ error: "invalid_payout_value" }, { status: 400 });
  }

  // Validate payout ranges
  if (payoutType === "percentage" && (payoutValue < 1 || payoutValue > 100)) {
    return NextResponse.json(
      { error: "percentage_must_be_1_to_100" },
      { status: 400 }
    );
  }

  if (payoutType === "fixed" && payoutValue > 10000) {
    return NextResponse.json(
      { error: "fixed_amount_too_high" },
      { status: 400 }
    );
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

  if (invite.status !== "SENT") {
    return NextResponse.json({ error: "invite_already_used" }, { status: 400 });
  }

  const providerId = invite.providerId as string;
  const now = new Date().toISOString();

  // Load provider to get area for GSI update
  const providerResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PROVIDER#${providerId}`, SK: "PROFILE" },
    })
  );

  if (!providerResult.Item) {
    return NextResponse.json({ error: "provider_not_found" }, { status: 404 });
  }

  const provider = providerResult.Item;
  const area = provider.area as string;
  const reliabilityScore = (provider.reliabilityScore as number) || 50;
  const oldPhone = provider.whatsappPhone as string | undefined;

  // Check if phone is already mapped to a DIFFERENT provider
  const phoneResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHONE#${trimmedPhone}`, SK: "PROVIDER" },
    })
  );

  if (phoneResult.Item && phoneResult.Item.providerId !== providerId) {
    return NextResponse.json({ error: "phone_in_use" }, { status: 409 });
  }

  // Update provider with payout preferences, whatsappPhone, and activate
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PROVIDER#${providerId}`, SK: "PROFILE" },
        UpdateExpression: `
          SET payoutType = :payoutType,
              payoutValue = :payoutValue,
              isActive = :isActive,
              whatsappPhone = :phone,
              claimedAt = :now,
              updatedAt = :now,
              GSI2PK = :gsi2pk,
              GSI2SK = :gsi2sk
        `,
        ExpressionAttributeValues: {
          ":payoutType": payoutType,
          ":payoutValue": payoutValue,
          ":isActive": isActive,
          ":phone": trimmedPhone,
          ":now": now,
          ":gsi2pk": `AREA#${area}`,
          ":gsi2sk": `SCORE#${invertedScore(reliabilityScore)}#PROVIDER#${providerId}`,
        },
      })
    );
  } catch (error) {
    console.error("[claim] Failed to update provider:", error);
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 }
    );
  }

  // Create/update PHONE mapping item (conditional to avoid overwriting another provider's mapping)
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PHONE#${trimmedPhone}`,
          SK: "PROVIDER",
          providerId,
          createdAt: now,
        },
        ConditionExpression: "attribute_not_exists(PK) OR providerId = :pid",
        ExpressionAttributeValues: {
          ":pid": providerId,
        },
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      // Race condition: phone was just mapped to another provider
      return NextResponse.json({ error: "phone_in_use" }, { status: 409 });
    }
    console.error("[claim] Failed to create phone mapping:", error);
    // Non-fatal: continue even if phone mapping fails
  }

  // Delete old phone mapping if phone changed
  if (oldPhone && oldPhone !== trimmedPhone) {
    try {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: `PHONE#${oldPhone}`, SK: "PROVIDER" },
          ConditionExpression: "providerId = :pid",
          ExpressionAttributeValues: {
            ":pid": providerId,
          },
        })
      );
    } catch (error) {
      // Ignore - old mapping might not exist or belong to different provider
      if (!(error instanceof ConditionalCheckFailedException)) {
        console.error("[claim] Failed to delete old phone mapping:", error);
      }
    }
  }

  // Mark invite as used with conditional check
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `INVITE#${inviteCode}`, SK: "INVITE" },
        UpdateExpression: "SET #status = :used, usedAt = :now",
        ConditionExpression: "#status = :sent",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":used": "USED",
          ":sent": "SENT",
          ":now": now,
        },
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      // Race condition: invite was already used
      return NextResponse.json({ error: "invite_already_used" }, { status: 400 });
    }
    console.error("[claim] Failed to update invite:", error);
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    providerId,
    isActive,
  });
}
