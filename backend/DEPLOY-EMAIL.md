# Outbound email (OTP and transactional)

## Transports

| Variable | Meaning |
|----------|---------|
| `EMAIL_TRANSPORT` | Omit or any value other than `ses` → **SMTP** via Nodemailer (pooled). Set to `ses` → **Amazon SES API v2** (`SendEmail`). |
| `SES_REGION` | Optional. SES region; defaults to `AWS_REGION`, then `ap-south-1`. |
| `AWS_REGION` | Used for SES when `SES_REGION` is unset (same as S3 and other AWS clients). |

SMTP variables (when not using SES, or unused when SES is active): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`.

## Amazon SES (`EMAIL_TRANSPORT=ses`)

1. **Verify** the sending domain or `EMAIL_FROM` address in SES, enable DKIM, and publish SPF/DMARC for that domain.
2. **Leave the SES sandbox** (or you can only send to verified addresses).
3. **IAM** for the runtime role or keys: at minimum `ses:SendEmail` (and `ses:SendRawEmail` if you later switch to raw MIME).
4. Set `EMAIL_FROM` to an address or domain identity that is verified in the same account/region as the client.

OTP and all other mail sent through `EmailService` use the same transport.

## OTP diagnostics

- **`OTP_CONSOLE_ONLY`**: When `true`/`1`/`yes`, the API still returns success but **no email is sent** (code is logged). Ensure this is **unset** in production.
- **Startup**: If `NODE_ENV` is `production` or `prod` and `OTP_CONSOLE_ONLY` is enabled, the API logs a **warning** at boot.
- **`email_logs` (Dynamo)**: Rows include `trigger_event` (e.g. `auth_otp`), `status` (`sent` / `failed`), `error_message`, and `sent_at`. Use this to confirm the backend accepted the send versus SMTP/SES errors.

## Deliverability

If the API returns success but recipients see nothing: check spam/promotions, DNS authentication (SPF, DKIM, DMARC), and SES reputation / suppression list. Moving from generic SMTP to SES with a verified domain usually improves inbox placement.
