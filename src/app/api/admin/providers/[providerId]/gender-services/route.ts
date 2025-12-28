import { NextResponse } from "next/server";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const OPS_TOKEN = process.env.OPS_TOKEN;
const VALID_GENDER_SERVICES = ["men", "women"];

interface GenderServicesInput {
  genderServices: string[];
}

function validateInput(body: unknown): body is GenderServicesInput {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.genderServices)) return false;
  if (obj.genderServices.length === 0) return false;
  for (const gs of obj.genderServices) {
    if (typeof gs !== "string" || !VALID_GENDER_SERVICES.includes(gs)) return false;
  }
  return true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { providerId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!validateInput(body)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { genderServices } = body;
  const now = new Date().toISOString();

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PROVIDER#${providerId}`, SK: "PROVIDER" },
        UpdateExpression: "SET genderServices = :gs, updatedAt = :now",
        ExpressionAttributeValues: {
          ":gs": genderServices,
          ":now": now,
        },
      })
    );

    return NextResponse.json({
      ok: true,
      providerId,
      genderServices,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[gender-services] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
