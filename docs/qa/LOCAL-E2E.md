# Local E2E environment

End-to-end tests live under [`backend/test/e2e/`](/Users/manyashukla/evision-platform/backend/test/e2e/) and use **Dynalite** (in-process DynamoDB) plus **Nest + supertest**. No real Razorpay API call is required for checkout: tests call `POST /checkout/confirm` with a valid HMAC using `RAZORPAY_KEY_SECRET`.

## One-command test run

From the `backend` directory:

```bash
npm install
npm run test:e2e
```

Jest starts Dynalite on an ephemeral port, creates tables via `ensureEvisionDynamoTables` from [`src/seeds/dynamo-tables.setup.ts`](/Users/manyashukla/evision-platform/backend/src/seeds/dynamo-tables.setup.ts), boots `AppModule` with mocked email, push, and S3 (PDF URLs point at a tiny local HTTP server so GST ZIP `fetch` succeeds).

## Manual local stack (optional)

If you prefer a long-running Dynalite process instead of the in-test server:

1. Start Dynalite: `npx dynalite --port 8000`
2. Set in `.env`: `DYNAMODB_ENDPOINT=http://127.0.0.1:8000`, `AWS_ACCESS_KEY_ID=local`, `AWS_SECRET_ACCESS_KEY=local`
3. Create tables: `npm run setup:tables`
4. Seed superadmin (for UI/manual calls): `npm run seed:superadmin`
5. Run API: `npm run start:dev`

## Environment variables referenced in E2E

| Variable | Purpose in tests |
|----------|-------------------|
| `JWT_SECRET` | JWT signing (defaults in spec if unset) |
| `RAZORPAY_KEY_SECRET` | Client payment signature for `/checkout/confirm` |
| `SHIPROCKET_MOCK` | `true` / `1` so shipping never calls Shiprocket API |
| `SHIPROCKET_WEBHOOK_TOKEN` | Header `x-api-key` or `x-shiprocket-token` for `POST /webhooks/shiprocket` |

Email and Firebase push are mocked in tests; SMTP and `FIREBASE_SERVICE_ACCOUNT_JSON` are not required.
