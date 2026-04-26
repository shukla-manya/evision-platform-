# API performance and DynamoDB indexes

## Response times

Every HTTP response includes **`X-Response-Time: Nms`**. The Nest HTTP logger also records:

- **`≥250ms`** — `log` line with method, path, status, duration  
- **`≥800ms`** — `warn` line (investigate slow handlers or cold Dynamo)

Use browser DevTools Network or `curl -sI` to inspect headers.

## Catalogue (`GET /products`)

- **With `category_id`** — single query on **`CategoryIndex`** (`category_id`).
- **Without category, with categories in DB** — one query per category, **chunked** (12 parallel) to cap concurrency, then de-duplicated by product `id`.
- **Without category, empty category table** — queries **`AdminIndex`** per **approved** admin (`StatusIndex` on `evision_admins`), chunked; falls back to **table scan** only if there are no approved shops (dev edge case).

Load test data: `cd backend && npm run seed:perf` (defaults: 48 products, optional `PERF_ORDER_GROUPS`). Env: `PERF_PRODUCT_COUNT`, `PERF_ORDER_GROUPS`.

## New / notable GSIs

| Table | Index | Keys | Used for |
|-------|--------|------|------------|
| `evision_order_groups` | **RazorpayOrderIndex** | `razorpay_order_id` (HASH) | Webhook / confirm lookup by Razorpay order id (replaces full-table scan) |

**Existing AWS accounts:** create this GSI on `evision_order_groups` (Console or IaC) before relying on the fast path; until then, `checkout.service` falls back to a filtered **scan** if the query fails.

## Service bookings (`UserIndex`)

`evision_service_bookings` already had **`UserIndex`** on **`user_id`**. Bookings now set **`user_id`** equal to **`customer_id`** on create so **`GET`** customer lists use **Query** on that index. If the query returns nothing (legacy rows), code falls back to a **scan** filtered by `customer_id`.

## Geo (lat / lng)

Nearby electricians use **`LiveElectriciansIndex`** (`discovery_key` + `id`) and in-app distance filtering — DynamoDB does not offer a native lat/lng index; true geo search would need a geohash attribute or a dedicated geo service.
