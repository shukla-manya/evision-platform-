# E2E bug log and test matrix

Single running document for local HTTP E2E (`backend/test/e2e/flows.e2e-spec.ts`, `backend/test/e2e/http-e2e-runner.ts`). Update **Status** and **Verified** when you fix or re-run a row.

## Test matrix

| Area | What we prove | Key APIs / evidence | Result | Last run |
|------|----------------|---------------------|--------|----------|
| Multi-shop order | Cart from two `admin_id`s → one `order_group_id`, two sub-orders, totals 100 + 500 | `POST /cart/add`, `POST /checkout/confirm`, `GET /orders/my` | Pass (automated) | 2026-04-26 |
| Payment success | Idempotent duplicate confirm | Second `POST /checkout/confirm` → `duplicate: true` | Pass (automated) | 2026-04-26 |
| Payment failure | No `evision_orders` rows for user | `POST /checkout/confirm` `status: failure` + Dynamo scan | Pass (automated) | 2026-04-26 |
| Split + emails | Two sub-order totals; customer + ≥2 admin payment emails | Email spy: `sendPaymentConfirmedCustomer`, `sendPaymentConfirmedAdmin` | Pass (automated) | 2026-04-26 |
| Shiprocket (mock) | AWB `MOCKAWB*`, tracking fields set | `POST /admin/orders/:id/ship` with `SHIPROCKET_MOCK=true` | Pass (automated) | 2026-04-26 |
| Delivery emails | Non-terminal + terminal stages fire templates | Webhook + spy: `sendOrderShipped`, `sendOrderStageUpdate` | Pass (automated) | 2026-04-26 |
| Invoice | After `delivered`, invoice row exists | Dynamo `evision_invoices` + `sendInvoiceGenerated` | Pass (automated) | 2026-04-26 |
| Multi-shop second fulfilment | Second admin ships their sub-order → second invoice | Admin B ship + webhook + invoice scan for `orderBId` | Pass (automated) | 2026-04-26 |
| Dealer GST | Dealer order → `gst_invoice_url` + ZIP | `GET /orders/my`, `GET /orders/my/gst-invoices-zip` | Pass (automated) | 2026-04-26 |
| Service accept / job / review | Accept → job statuses → review → history | Electrician + customer routes | Pass (automated) | 2026-04-26 |
| Live track (REST) | While `job_status` is `on_the_way`, customer can load booking detail | `GET /service/booking/:bookingId` | Pass (automated) | 2026-04-26 |
| Service decline | Request returns `open`, electrician cleared | Dynamo `evision_service_requests` | Pass (automated) | 2026-04-26 |
| Booking expiry | Stale `pending` booking → `expired` | `ServiceService.expirePendingBookings()` (same as interval job) | Pass (automated) | 2026-04-26 |
| Superadmin approvals | Admin approve/reject/suspend; electrician approve/reject; dealer GST verify | `PUT /superadmin/...` | Pass (automated) | 2026-04-26 |
| Superadmin review moderation | List reviews, delete one | `GET /superadmin/reviews`, `DELETE /superadmin/reviews/:id` | Pass (automated) | 2026-04-26 |
| Live map (Socket.IO) | Electrician publishes location; customer receives updates | Web + mobile clients | Manual | — |
| UI checkout / superadmin | Full browser flows | Playwright/Cypress (not in repo) | Not automated | — |

**Regression smoke (fast):** `cd backend && npm test` (unit) — **Pass**, 2026-04-26. **`npm run build`** — **Pass**, 2026-04-26.

**Full Jest E2E:** `cd backend && npm run test:e2e` — uses `@swc/jest` and a 600s timeout. First `TestingModule.compile()` on a full `AppModule` is CPU-heavy; allow **at least 10–15 minutes** on a cold laptop, or use `npm run test:e2e:http` for the same assertions without the Jest VM. Watch for `[e2e] dynamic-import…` / `[e2e] compile done…` in logs.

**Note:** Do not pipe Jest through `tail` until the run finishes, or you will see no output until the process exits (stdout buffering).

---

## Bug register

| ID | Severity | Flow | Repro | Expected | Actual | Root cause (if known) | Status | Verified |
|----|----------|------|-------|----------|--------|------------------------|--------|----------|
| E2E-001 | Major | Tooling / E2E | Run `http-e2e-runner.ts` with top-level `import { AppModule } from '…'` | App boots against in-process Dynalite | Process hung before tests | Eager `AppModule` import loads large graph before local env is stable; aligns with Jest + AWS SDK VM issues noted in runner header | Fixed | Dynamic `import()` of `AppModule` + providers before `compile()` (`http-e2e-runner.ts`) |
| E2E-002 | Major | Build | `npm run build` | Clean compile | TS2339 on `unknown` for `toLowerCase` in `products.service.ts` | Stricter inference on Dynamo `Record` fields | Fixed | `String(p.brand ?? '')` / `String(p.name ?? '')` |
| E2E-003 | Minor | Local DB | Run `ensureEvisionDynamoTables` against Dynalite | Quiet logs for known TTL limitation | `console.warn` on every E2E run | Dynalite does not implement `UpdateTimeToLive` | Fixed | Downgrade expected emulator errors to `console.debug` in `dynamo-tables.setup.ts` |
| E2E-004 | Major | Tooling / Jest E2E | `npm run test:e2e` | `beforeAll` completes | Hook timeout at 300s | Nest `compile()` + ts-jest type-check path very slow on full `AppModule` | Mitigated | `jest.setTimeout(600000)`, `testTimeout: 600000`, `@swc/jest` in `jest-e2e.config.js`; progress logs in `flows.e2e-spec.ts` |
| E2E-005 | Minor | Coverage | Multi-shop E2E only shipped shop A | Invoice + delivery for every paid sub-order | Only first sub-order exercised end-to-end | Test gap | Fixed | Ship shop B + webhook + invoice assert in `flows.e2e-spec.ts` and `http-e2e-runner.ts` |
| E2E-006 | Minor | Coverage | Service E2E skipped customer booking detail during active job | Map screen can call REST for snapshot | Not asserted | Test gap | Fixed | `GET /service/booking/:id` after `on_the_way` |
| E2E-007 | Minor | Coverage | Superadmin review delete not in E2E | Moderation API works | Untested | Test gap | Fixed | `GET`/`DELETE /superadmin/reviews` when a review exists |
| E2E-008 | Minor | Tooling | `npm run test:e2e` on a slow or sandboxed runner | `beforeAll` finishes within patience window | Can sit at `Nest TestingModule.compile()` for many minutes | Full-app Nest metadata scan + large provider graph | Mitigated (SWC + 600s timeout + logs); not a product defect | Re-run locally without piping stdout |

---

## Re-test checklist (after fixes)

1. `cd backend && npm test`
2. `cd backend && npm run build`
3. `cd backend && npm run test:e2e` (allow several minutes on first run)
4. Optionally: `cd backend && npm run test:e2e:http`

Update the **Last run** column in the matrix and **Verified** in the bug table when you complete a full pass.
