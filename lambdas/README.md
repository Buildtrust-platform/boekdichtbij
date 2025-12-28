# Lambda Schedulers

## Deployment

### 1. Expiry Scheduler

Expires bookings that pass their assignment deadline.

```bash
cd lambdas/expiry-scheduler
zip -r expiry-scheduler.zip index.mjs
```

**Create Lambda:**
- Runtime: Node.js 20.x
- Handler: index.handler
- Timeout: 30 seconds
- Memory: 128 MB

**Environment variables:**
```
DDB_TABLE_NAME=boekdichtbij_main
AWS_REGION=eu-central-1
AREAS=ridderkerk,barendrecht,rotterdam_zuid
LIMIT_PER_AREA=50
```

**IAM Policy:** Use `policy.json`

**EventBridge Scheduler:**
1. Go to EventBridge → Schedules → Create schedule
2. Name: `boekdichtbij-expiry-scheduler`
3. Schedule: `rate(1 minute)`
4. Target: Lambda → `boekdichtbij-expiry-scheduler`

---

### 2. Waves Scheduler

Sends Wave 2 and Wave 3 notifications for pending bookings.

```bash
cd lambdas/waves-scheduler
zip -r waves-scheduler.zip index.mjs
```

**Create Lambda:**
- Runtime: Node.js 20.x
- Handler: index.handler
- Timeout: 60 seconds
- Memory: 128 MB

**Environment variables:**
```
DDB_TABLE_NAME=boekdichtbij_main
AWS_REGION=eu-central-1
AREAS=ridderkerk,barendrecht,rotterdam_zuid
NEARBY_AREA=rotterdam_zuid
LIMIT_PER_AREA=50
WAVE2_MINUTES=5
WAVE3_MINUTES=10
WAVE2_COUNT=3
WAVE3_COUNT=3
```

**IAM Policy:** Use `policy.json`

**EventBridge Scheduler:**
1. Go to EventBridge → Schedules → Create schedule
2. Name: `boekdichtbij-waves-scheduler`
3. Schedule: `rate(1 minute)`
4. Target: Lambda → `boekdichtbij-waves-scheduler`

---

## Testing Locally

You can test the Lambda logic locally using Node.js:

```bash
cd lambdas/expiry-scheduler
node -e "import('./index.mjs').then(m => m.handler())"
```

Note: Requires AWS credentials configured and environment variables set.
