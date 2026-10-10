# Private voucher email

The administrator can select recipients from a saved private voucher, edit the subject and plain-text body, and send directly from **Ưu đãi → Soạn email**. The current voucher code, conditions and store link are appended automatically. `{ten_khach}` and `{email}` personalize each individual message. One batch supports up to 50 recipients. Email addresses come from verified Supabase Auth accounts, not editable profile fields or browser input.

Apply `supabase/migrations/202610100012_voucher_email.sql` before deploying the email workflow. It creates administrator-readable campaign/delivery history and a service-only outbox preparation function. There are no automatic sends when creating or editing vouchers.

Set these **server-only Vercel production environment variables**, then redeploy:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender@example.com
SMTP_PASSWORD=your-provider-app-password
SMTP_FROM=your-sender@example.com
# Optional: defaults to true on port 465, false on other ports.
SMTP_SECURE=true
```

Other SMTP providers are supported. Ports using STARTTLS (usually 587) must use `SMTP_SECURE=false`; TLS remains required. Authentication and certificate verification stay enabled. Never prefix SMTP credentials with `NEXT_PUBLIC_`. The Gmail app password used by Supabase Auth is not automatically available to this website; authentication confirmation emails and voucher emails have separate server configuration.

Until SMTP is configured, the composer reports that email is unavailable and disables sending. Configuration alone does not prove provider connectivity. Validate delivery only with an explicitly chosen synthetic test account/inbox; do not send test vouchers to existing customers.

Each batch has a persistent idempotency key and each recipient is claimed once before SMTP. Retrying the same batch does not resend sent, failed, in-progress or uncertain messages. A provider rejection is displayed as failed; a lost acknowledgement is displayed as uncertain because the email may already have been accepted. If SMTP accepted an email but the database response was interrupted, its in-progress state is retained rather than risking a duplicate. Check email provider logs or the sender's sent folder before explicitly composing a new batch. “Máy chủ email đã tiếp nhận” means accepted by SMTP, not guaranteed inbox delivery.

All HTTP operations require an administrator. Sending also requires the canonical same-origin browser request. Histories and raw email data are hidden from customers by row-level security. Provider errors are replaced with safe localized messages; credentials and message bodies are never logged.
