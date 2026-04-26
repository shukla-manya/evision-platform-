# Email triggers — manual QA

Use a dedicated mailbox (for example `qa+yourapp@yourdomain.com`) and point SMTP to a catcher in development so nothing hits real users.

## Mailpit (recommended)

1. Run [Mailpit](https://github.com/axllent/mailpit) locally (Docker: `docker run -d -p 8025:8025 -p 1025:1025 axllent/mailpit`).
2. In `backend/.env`, set:
   - `SMTP_HOST=127.0.0.1`
   - `SMTP_PORT=1025`
   - `SMTP_USER=` and `SMTP_PASS=` empty if your catcher allows unauthenticated relay on localhost.
   - `EMAIL_FROM` / `EMAIL_FROM_NAME` as desired (Mailpit accepts any).
3. Open `http://127.0.0.1:8025` to read messages.

## Trigger matrix

After each action, confirm in Mailpit: **HTML body**, correct **subject**, and `email_logs` **trigger_event** in Dynamo (if enabled).

| trigger_event | Recipient role | How to trigger manually |
|---------------|----------------|-------------------------|
| `admin_registered` | superadmin | Register a new shop (web `/admin/register` or mobile). `SUPERADMIN_EMAIL` must be set. |
| `admin_approved` | shop admin | Superadmin: approve a **pending** shop (`/super/shop-registrations`). |
| `admin_rejected` | shop admin | Superadmin: reject a pending shop with a reason. |
| `electrician_registered` | superadmin | Register a technician (pending). `SUPERADMIN_EMAIL` set. Email includes optional skills/address/doc links when provided. |
| `electrician_approved` | electrician | Superadmin: approve pending technician. |
| `electrician_rejected` | electrician | Superadmin: reject pending technician with reason. |
| `dealer_gst_verified` | dealer | Superadmin: mark dealer GST as verified (flow that calls `sendDealerGstVerified`). |
| `electrician_nearby_order_alert` | electrician | Complete a **paid** order where checkout notifies nearby electricians (geo + product summary); depends on electrician email and `checkout.service` path. |
| `service_booking_request` | electrician | Customer creates a service booking request to a specific technician (app flow). |
| `service_booking_pending` | customer | Same as above after request is created. |
| `service_booking_accepted` | customer | Technician accepts the booking in app. |
| `service_booking_declined` | customer | Technician declines. |
| `service_booking_expired` | customer | Wait for booking TTL without response, or simulate expiry in dev data. |
| `service_job_status_update` | customer | Technician advances job status in service flow. |
| `service_review_prompt` | customer | Job completed path that sends review prompt. |
| `electrician_review_received` | electrician | Customer submits a review for that technician. |
| `payment_confirmed` | customer | Successful Razorpay (or test) payment that creates order group; customer must have `email`. |
| `payment_confirmed_admin` | shop admin | Same successful payment; each affected shop admin email receives **shop-oriented** new-order mail (distinct from customer receipt). |
| `payment_failed` | customer | Payment failure webhook / failed capture path with user email. |
| `order_cancelled` | customer / admin | Cancel order from customer or admin flow that calls `sendOrderCancelled` for both parties as applicable. |
| `order_shipped` | customer | Admin marks shipment created with tracking fields. |
| `picked_up` | customer | Admin/shipment updates order stage to picked up. |
| `in_transit` | customer | Stage update to in transit. |
| `out_for_delivery` | customer | Stage update to out for delivery. |
| `delivered` | customer | Stage update to delivered. |
| `invoice_generated` | customer | Invoice generation after order (e.g. admin or automatic invoice path); dealer/GST blocks appear only for dealer orders with those PDFs. |

## Automated smoke

From the backend package:

```bash
npm test
```

This runs `src/modules/emails/email.service.spec.ts`, which exercises every `EmailService` send method with a mocked SMTP transport and asserts HTML renders without missing templates.

## Production checklist

- `nest build` copies `src/modules/emails/templates/**/*.html` into `dist/modules/emails/templates/` (see `nest-cli.json` `assets`).
- Deploy **`dist` only**; templates must be present next to compiled `email.service.js`.
