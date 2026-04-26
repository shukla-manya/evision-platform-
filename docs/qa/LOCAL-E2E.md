# Local end-to-end environment

## DynamoDB (local)

**Embedded (default for automated E2E)**  
`backend/test/e2e/http-e2e-runner.ts` and `backend/test/e2e/flows.e2e-spec.ts` start an in-process Dynalite server on a random port and set `DYNAMODB_ENDPOINT` before creating tables.

**Standalone Dynalite (manual dev / debugging)**  

1. From `backend/`, install deps once: `npm install`
2. Start Dynalite (script uses port **8001**):  
   `npm run dynamo:local`  
   Or: `npx dynalite --port 8001`
3. Point the API at it (example):  
   `export DYNAMODB_ENDPOINT=http://127.0.0.1:8001`  
   `export AWS_ACCESS_KEY_ID=local`  
   `export AWS_SECRET_ACCESS_KEY=local`  
   `export AWS_REGION=ap-south-1`
4. Create tables:  
   `npm run setup:tables`
5. Optional seeds:  
   `npm run seed:superadmin`  
   (See `backend/src/seeds/` for other seed entrypoints.)

TTL on `evision_otps` may not apply under Dynalite; that is expected and is logged at debug level during table setup when the emulator returns a generic `UnknownError`.

## Shiprocket

Set **`SHIPROCKET_MOCK`** to `true`, `1`, or `yes` (see `ShiprocketService.isMockEnabled()` in `backend/src/modules/orders/shiprocket.service.ts`). E2E tests set this automatically. Webhook auth uses **`SHIPROCKET_WEBHOOK_TOKEN`** (header `x-api-key` or `x-shiprocket-token`).

## Razorpay

- **Automated E2E** uses `POST /checkout/confirm` with a synthetic `razorpay_order_id` / `razorpay_payment_id` and a valid HMAC (`RAZORPAY_KEY_SECRET`); no call to Razorpay’s `orders.create` API.
- **`POST /checkout/create-order`** still uses the Razorpay SDK and needs **`RAZORPAY_KEY_ID`** + **`RAZORPAY_KEY_SECRET`** and network unless you add a test-only stub.

## Email / push in automation

E2E overrides **`EmailService`** and **`PushService`** with test doubles so flows assert **which methods were invoked** (e.g. `sendPaymentConfirmedCustomer`) without SMTP or FCM.

## Commands (summary)

| Goal | Command |
|------|---------|
| Unit tests | `cd backend && npm test` |
| Jest HTTP E2E (single suite, long first compile) | `cd backend && npm run test:e2e` |
| Standalone HTTP E2E script (no Jest VM) | `cd backend && npm run test:e2e:http` |
| Production build | `cd backend && npm run build` |

Socket-based **live tracking** (`/service-tracking`, `/location`) is exercised manually from `frontend-web` / `mobile-app`; REST **`GET /service/booking/:bookingId`** is covered in the automated suite after `job_status` becomes `on_the_way`.
