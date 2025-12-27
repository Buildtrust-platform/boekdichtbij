#!/bin/bash
set -e

# Configuration
LAMBDA_NAME="boekdichtbij-whatsapp-inbound"
REGION="eu-central-1"
ROLE_NAME="boekdichtbij-lambda-role"
API_NAME="boekdichtbij-whatsapp-api"

# Environment variables for Lambda (load from environment)
DDB_TABLE_NAME="${DDB_TABLE_NAME:-boekdichtbij_main}"
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}"
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}"
TWILIO_WHATSAPP_FROM="${TWILIO_WHATSAPP_FROM:-}"

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ] || [ -z "$TWILIO_WHATSAPP_FROM" ]; then
  echo "Error: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM must be set"
  exit 1
fi

echo "=== Deploying WhatsApp Webhook Lambda ==="

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# Step 1: Create IAM role if it doesn't exist
echo "Checking IAM role..."
if ! aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
  echo "Creating IAM role..."
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }'

  # Attach basic Lambda execution policy
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # Create and attach DynamoDB policy
  aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name DynamoDBAccess \
    --policy-document "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Action\": [
          \"dynamodb:GetItem\",
          \"dynamodb:PutItem\",
          \"dynamodb:UpdateItem\",
          \"dynamodb:Query\",
          \"dynamodb:Scan\"
        ],
        \"Resource\": [
          \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${DDB_TABLE_NAME}\",
          \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${DDB_TABLE_NAME}/index/*\"
        ]
      }]
    }"

  echo "Waiting for role to propagate..."
  sleep 10
fi

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "Role ARN: $ROLE_ARN"

# Step 2: Package Lambda
echo "Packaging Lambda..."
cd "$(dirname "$0")/lambda-whatsapp-inbound"
npm install --omit=dev
zip -r ../lambda-whatsapp-inbound.zip .
cd ..

# Step 3: Create or update Lambda function
echo "Deploying Lambda function..."
if aws lambda get-function --function-name $LAMBDA_NAME --region $REGION 2>/dev/null; then
  echo "Updating existing Lambda..."
  aws lambda update-function-code \
    --function-name $LAMBDA_NAME \
    --zip-file fileb://lambda-whatsapp-inbound.zip \
    --region $REGION

  aws lambda update-function-configuration \
    --function-name $LAMBDA_NAME \
    --environment "Variables={DDB_TABLE_NAME=${DDB_TABLE_NAME},TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID},TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN},TWILIO_WHATSAPP_FROM=${TWILIO_WHATSAPP_FROM}}" \
    --region $REGION
else
  echo "Creating new Lambda..."
  aws lambda create-function \
    --function-name $LAMBDA_NAME \
    --runtime nodejs20.x \
    --handler index.handler \
    --role $ROLE_ARN \
    --zip-file fileb://lambda-whatsapp-inbound.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={DDB_TABLE_NAME=${DDB_TABLE_NAME},TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID},TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN},TWILIO_WHATSAPP_FROM=${TWILIO_WHATSAPP_FROM}}" \
    --region $REGION
fi

# Wait for Lambda to be ready
echo "Waiting for Lambda to be active..."
aws lambda wait function-active --function-name $LAMBDA_NAME --region $REGION

# Step 4: Create API Gateway (HTTP API)
echo "Setting up API Gateway..."
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='${API_NAME}'].ApiId" --output text)

if [ -z "$API_ID" ]; then
  echo "Creating new HTTP API..."
  API_ID=$(aws apigatewayv2 create-api \
    --name $API_NAME \
    --protocol-type HTTP \
    --region $REGION \
    --query 'ApiId' --output text)
fi
echo "API ID: $API_ID"

# Create Lambda integration
echo "Creating Lambda integration..."
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION \
  --query "Items[?IntegrationType=='AWS_PROXY'].IntegrationId" --output text)

if [ -z "$INTEGRATION_ID" ]; then
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}" \
    --payload-format-version "2.0" \
    --region $REGION \
    --query 'IntegrationId' --output text)
fi
echo "Integration ID: $INTEGRATION_ID"

# Create route
echo "Creating route..."
ROUTE_EXISTS=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query "Items[?RouteKey=='POST /inbound'].RouteId" --output text)

if [ -z "$ROUTE_EXISTS" ]; then
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "POST /inbound" \
    --target "integrations/${INTEGRATION_ID}" \
    --region $REGION
fi

# Create/update stage
echo "Creating stage..."
STAGE_EXISTS=$(aws apigatewayv2 get-stages --api-id $API_ID --region $REGION \
  --query "Items[?StageName=='\$default'].StageName" --output text)

if [ -z "$STAGE_EXISTS" ]; then
  aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name '$default' \
    --auto-deploy \
    --region $REGION
fi

# Grant API Gateway permission to invoke Lambda
echo "Adding Lambda permission..."
aws lambda add-permission \
  --function-name $LAMBDA_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
  --region $REGION 2>/dev/null || true

# Get the API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --region $REGION --query 'ApiEndpoint' --output text)

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Webhook URL: ${API_ENDPOINT}/inbound"
echo ""
echo "Configure this URL in Twilio Console:"
echo "1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
echo "2. Set 'When a message comes in' to: ${API_ENDPOINT}/inbound"
echo "3. Method: POST"
echo ""

# Cleanup
rm -f lambda-whatsapp-inbound.zip
