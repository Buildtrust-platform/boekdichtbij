#!/bin/bash

# Twilio Content Template Creation Script
# This creates a WhatsApp template with quick reply buttons

# Load from environment or .env.local
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}"
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}"

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
  echo "Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set"
  exit 1
fi

echo "Creating Twilio Content Template..."

# Create the content template with quick reply buttons
RESPONSE=$(curl -s -X POST "https://content.twilio.com/v1/Content" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "boekdichtbij_booking_notification",
    "language": "nl",
    "variables": {
      "1": "Knipbeurt",
      "2": "Ochtend (9:00 - 12:00)",
      "3": "Ridderkerk",
      "4": "20"
    },
    "types": {
      "twilio/quick-reply": {
        "body": "*Nieuwe boeking via BoekDichtbij*\n\nDienst: {{1}}\nTijdvak: {{2}}\nLocatie: {{3}}\nUitbetaling: €{{4}}",
        "actions": [
          {
            "id": "accept",
            "title": "Accepteren"
          },
          {
            "id": "decline",
            "title": "Weigeren"
          }
        ]
      }
    }
  }')

echo ""
echo "Response:"
echo "$RESPONSE" | jq .

# Extract the SID
CONTENT_SID=$(echo "$RESPONSE" | jq -r '.sid // empty')

if [ -n "$CONTENT_SID" ]; then
  echo ""
  echo "=========================================="
  echo "Content Template created successfully!"
  echo "=========================================="
  echo ""
  echo "Content SID: $CONTENT_SID"
  echo ""
  echo "Add this to your .env.local:"
  echo "TWILIO_BOOKING_TEMPLATE_SID=$CONTENT_SID"
  echo ""
  echo "And to your Lambda environment variables."
else
  echo ""
  echo "Failed to create template. Check the response above."
fi
