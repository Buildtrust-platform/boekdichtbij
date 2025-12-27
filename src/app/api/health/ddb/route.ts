import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { NextResponse } from "next/server";

const client = new DynamoDBClient({
  region: process.env.APP_AWS_REGION || process.env.AWS_REGION,
  credentials: process.env.APP_AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: process.env.DDB_TABLE_NAME,
      Limit: 1,
    });

    await client.send(command);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
