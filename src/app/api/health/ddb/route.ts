import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { NextResponse } from "next/server";

export async function GET() {
  const region = process.env.APP_AWS_REGION || process.env.AWS_REGION;
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const tableName = process.env.DDB_TABLE_NAME;

  // Debug: check if env vars are present
  if (!accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      {
        status: "error",
        message: "Missing credentials",
        debug: {
          hasRegion: !!region,
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretAccessKey,
          hasTableName: !!tableName,
        },
      },
      { status: 500 }
    );
  }

  const client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: 1,
    });

    await client.send(command);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
