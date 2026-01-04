import { NextResponse } from "next/server";
import { UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { getProviderProfile } from "@/lib/providerStore";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface RouteContext {
  params: Promise<{ providerId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { providerId } = await context.params;

  try {
    // Use shared loader with migrate-on-read
    const provider = await getProviderProfile(providerId);

    if (!provider) {
      return NextResponse.json({ error: "provider_not_found" }, { status: 404 });
    }

    // After migration, always use PROFILE
    const providerSK = "PROFILE";

    if (!provider.whatsappPhone) {
      return NextResponse.json({ error: "missing_whatsapp_phone" }, { status: 409 });
    }

    const text = "Testbericht BoekDichtbij.\n\nAntwoord OK.";
    const sendResult = await sendWhatsApp(provider.whatsappPhone, text);

    const now = new Date().toISOString();
    const currentFailCount = provider.whatsappFailCount ?? 0;

    let whatsappStatus = provider.whatsappStatus ?? "UNKNOWN";
    let whatsappFailCount = currentFailCount;

    if (sendResult.ok) {
      whatsappStatus = "VALID";
      whatsappFailCount = 0;
    } else if (sendResult.mode === "twilio" && "error" in sendResult) {
      whatsappFailCount = currentFailCount + 1;
      const errorLower = sendResult.error.toLowerCase();
      if (
        errorLower.includes("unregistered") ||
        errorLower.includes("invalid") ||
        errorLower.includes("not a valid") ||
        errorLower.includes("is not a whatsapp")
      ) {
        whatsappStatus = "INVALID";
      }
    }

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROVIDER#${providerId}`,
          SK: providerSK,
        },
        UpdateExpression:
          "SET whatsappStatus = :status, whatsappLastCheckedAt = :checked, whatsappFailCount = :failCount, updatedAt = :now",
        ExpressionAttributeValues: {
          ":status": whatsappStatus,
          ":checked": now,
          ":failCount": whatsappFailCount,
          ":now": now,
        },
      })
    );

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PROVIDER#${providerId}`,
          SK: `EVENT#${now}#whatsapp_test`,
          type: "EVENT",
          eventName: "whatsapp_test",
          at: now,
          meta: { ok: sendResult.ok },
        },
      })
    );

    return NextResponse.json({
      ok: sendResult.ok,
      providerId,
      whatsappStatus,
      whatsappLastCheckedAt: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[test-whatsapp] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
