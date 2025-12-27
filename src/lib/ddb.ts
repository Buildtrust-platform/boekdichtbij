import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.APP_AWS_REGION || process.env.AWS_REGION,
  credentials:
    process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId:
            process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey:
            process.env.APP_AWS_SECRET_ACCESS_KEY ||
            process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
});

export const ddb = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.DDB_TABLE_NAME!;
