import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import https from "https";

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DDB_TABLE_NAME;

// Twilio credentials for sending replies
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

function parseFormData(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function formatWhatsApp(number) {
  return number.startsWith("whatsapp:") ? number : `whatsapp:${number}`;
}

async function sendWhatsApp(to, text) {
  const toFormatted = formatWhatsApp(to);
  const fromFormatted = formatWhatsApp(TWILIO_WHATSAPP_FROM);

  const data = new URLSearchParams({
    Body: text,
    From: fromFormatted,
    To: toFormatted,
  }).toString();

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.twilio.com",
        port: 443,
        path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Basic ${auth}`,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Twilio error: ${res.statusCode} ${body}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function findProviderByPhone(phone) {
  // Normalize phone: remove whatsapp: prefix if present
  const normalizedPhone = phone.replace("whatsapp:", "");

  // Scan for provider with matching phone
  // Note: In production with many providers, add a GSI on whatsappPhone
  const result = await ddb.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "whatsappPhone = :phone AND SK = :sk",
      ExpressionAttributeValues: {
        ":phone": normalizedPhone,
        ":sk": "PROVIDER",
      },
    })
  );

  return result.Items?.[0] || null;
}

async function findPendingBroadcastForProvider(providerId) {
  // Find bookings with BROADCAST sent to this provider that are still PENDING_ASSIGNMENT
  // This is a simplified approach - scan BROADCAST records for this provider

  // First, find all areas this provider serves
  const providerResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `PROVIDER#${providerId}`,
        ":sk": "PROVIDER",
      },
    })
  );

  const provider = providerResult.Items?.[0];
  if (!provider) return null;

  // Query bookings in PENDING_ASSIGNMENT status for this area
  const bookingsResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `AREA#${provider.area}#STATUS#PENDING_ASSIGNMENT`,
      },
      ScanIndexForward: false,
      Limit: 10,
    })
  );

  // Find the first booking that has a broadcast to this provider
  for (const booking of bookingsResult.Items || []) {
    const broadcastResult = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        FilterExpression: "providerId = :providerId",
        ExpressionAttributeValues: {
          ":pk": `BOOKING#${booking.bookingId}`,
          ":sk": "BROADCAST#",
          ":providerId": providerId,
        },
      })
    );

    if (broadcastResult.Items?.length > 0) {
      return booking;
    }
  }

  return null;
}

async function assignBookingToProvider(bookingId, providerId) {
  const now = new Date().toISOString();

  // Update booking status with condition check
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      UpdateExpression:
        "SET #status = :assigned, assignedProviderId = :providerId, acceptedAt = :now, updatedAt = :now, GSI1PK = :gsi1pk",
      ConditionExpression: "#status = :pending",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":assigned": "ASSIGNED",
        ":pending": "PENDING_ASSIGNMENT",
        ":providerId": providerId,
        ":now": now,
        ":gsi1pk": `AREA#ridderkerk#STATUS#ASSIGNED`,
      },
    })
  );

  // Log events
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${now}#provider_accepted`,
        type: "EVENT",
        eventName: "provider_accepted",
        at: now,
        meta: { providerId },
      },
    })
  );

  return true;
}

async function handleStatusCallback(data) {
  // Twilio status callback fields:
  // MessageSid, MessageStatus, To, From, ErrorCode (if failed)
  const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = data;

  console.log(`[Status] SID: ${MessageSid}, Status: ${MessageStatus}, To: ${To}`);

  // Log failed messages for monitoring
  if (MessageStatus === "failed" || MessageStatus === "undelivered") {
    console.error(`[Status] Message failed: ${ErrorCode} - ${ErrorMessage}`);

    // Optionally store failed status in DynamoDB for monitoring
    const now = new Date().toISOString();
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `MESSAGE#${MessageSid}`,
          SK: "STATUS",
          type: "MESSAGE_STATUS",
          messageSid: MessageSid,
          status: MessageStatus,
          to: To,
          errorCode: ErrorCode || null,
          errorMessage: ErrorMessage || null,
          updatedAt: now,
        },
      })
    );
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: "OK",
  };
}

export async function handler(event) {
  console.log("Received event:", JSON.stringify(event));

  try {
    // Determine route from path
    const path = event.rawPath || event.path || "";

    // Parse Twilio webhook payload (form-urlencoded)
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;

    const data = parseFormData(body);
    console.log("Parsed data:", JSON.stringify(data));

    // Handle status callback
    if (path.includes("/status") || data.MessageStatus) {
      return await handleStatusCallback(data);
    }

    const from = data.From; // e.g., "whatsapp:+31614855683"
    const messageBody = (data.Body || "").trim().toUpperCase();
    const buttonPayload = data.ButtonPayload || data.ButtonText || "";

    console.log(`Message from ${from}: "${messageBody}", ButtonPayload: "${buttonPayload}"`);

    // Find provider by phone
    const provider = await findProviderByPhone(from);
    if (!provider) {
      console.log("Provider not found for phone:", from);
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/xml" },
        body: "<Response></Response>",
      };
    }

    console.log("Found provider:", provider.providerId);

    // Check for button response first, then text response
    const isAccept =
      buttonPayload.startsWith("accept_") ||
      messageBody === "JA" ||
      messageBody === "YES" ||
      messageBody === "ACCEPTEREN";

    const isDecline =
      buttonPayload.startsWith("decline_") ||
      messageBody === "NEE" ||
      messageBody === "NO" ||
      messageBody === "WEIGEREN";

    // Extract bookingId from button payload if present
    let targetBookingId = null;
    if (buttonPayload.startsWith("accept_")) {
      targetBookingId = buttonPayload.replace("accept_", "");
    } else if (buttonPayload.startsWith("decline_")) {
      targetBookingId = buttonPayload.replace("decline_", "");
    }

    // Handle accept response
    if (isAccept) {
      // If we have a specific bookingId from button, we could use it
      // For now, find any pending booking for this provider
      const booking = await findPendingBroadcastForProvider(provider.providerId);

      if (!booking) {
        await sendWhatsApp(from, "Er is geen openstaande boeking om te accepteren.");
        return {
          statusCode: 200,
          headers: { "Content-Type": "text/xml" },
          body: "<Response></Response>",
        };
      }

      try {
        await assignBookingToProvider(booking.bookingId, provider.providerId);

        const confirmMsg = `Boeking geaccepteerd!

Dienst: ${booking.serviceName}
Tijdvak: ${booking.timeWindowLabel}
Adres: ${booking.address}, ${booking.postcode} ${booking.place}
Klant: ${booking.customerName}
Tel: ${booking.phone}

Succes!`;

        await sendWhatsApp(from, confirmMsg);
        console.log("Booking assigned:", booking.bookingId);
      } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
          await sendWhatsApp(from, "Deze boeking is al geaccepteerd door een andere kapper.");
        } else {
          throw err;
        }
      }
    } else if (isDecline) {
      await sendWhatsApp(from, "Begrepen. Je ontvangt geen verdere berichten voor deze boeking.");
    } else {
      await sendWhatsApp(from, "Tik op Accepteren of Weigeren, of antwoord JA/NEE.");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: "<Response></Response>",
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/xml" },
      body: "<Response></Response>",
    };
  }
}
