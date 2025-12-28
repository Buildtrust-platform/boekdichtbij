import {
  PutCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME } from "./client";
import type { User } from "../types/booking";

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
  phone?: string
): Promise<User> {
  const userId = ulid();
  const now = new Date().toISOString();

  const user: User = {
    userId,
    email,
    name,
    phone,
    passwordHash,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
        GSI1PK: `EMAIL#${email.toLowerCase()}`,
        GSI1SK: "USER",
        entityType: "USER",
        ...user,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    })
  );

  if (!result.Item) return null;

  return {
    userId: result.Item.userId,
    email: result.Item.email,
    name: result.Item.name,
    phone: result.Item.phone,
    passwordHash: result.Item.passwordHash,
    createdAt: result.Item.createdAt,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `EMAIL#${email.toLowerCase()}`,
        ":sk": "USER",
      },
    })
  );

  if (!result.Items || result.Items.length === 0) return null;

  const item = result.Items[0];
  return {
    userId: item.userId,
    email: item.email,
    name: item.name,
    phone: item.phone,
    passwordHash: item.passwordHash,
    createdAt: item.createdAt,
  };
}

export async function emailExists(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return user !== null;
}

export async function createOAuthUser(
  email: string,
  name: string,
  provider: string,
  providerAccountId: string
): Promise<User> {
  const userId = ulid();
  const now = new Date().toISOString();

  const user: User = {
    userId,
    email,
    name,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
        GSI1PK: `EMAIL#${email.toLowerCase()}`,
        GSI1SK: "USER",
        entityType: "USER",
        ...user,
        authProvider: provider,
        providerAccountId,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return user;
}
