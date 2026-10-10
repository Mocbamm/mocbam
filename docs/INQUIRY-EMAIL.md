# Contact-form email replies

In **Liên hệ → Biểu mẫu**, choose **Soạn phản hồi trực tiếp** on the customer's inquiry. Edit the subject and body, then explicitly press **Gửi phản hồi qua email**. The recipient is taken from the original stored inquiry by the server; the administrator cannot submit an arbitrary recipient address. Sent/failed/uncertain results and the ten most recent replies remain visible with the inquiry. Signed-in support chats continue to use their existing in-account replies.

Apply `202610100014_inquiry_email.sql` before deployment. This creates a private, administrator-readable reply outbox/history. Its preparation function is service-only and separately checks that the initiating user is an administrator. Sending requires an administrator session and the canonical same-origin browser request. Customers cannot read or write reply history through the database or API.

Contact replies share the server-only `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` and optional `SMTP_SECURE` configuration documented in [VOUCHER-EMAIL.md](VOUCHER-EMAIL.md). Without SMTP configuration the composer clearly disables sending. Supabase Auth's confirmation-email SMTP is separate from the website's SMTP configuration.

Every explicit reply has a durable idempotency key and is atomically claimed before SMTP. Double clicks and repeated HTTP requests do not send additional copies. Definite rejections are recorded as failed. A lost SMTP acknowledgement or interrupted result write remains uncertain/in-progress because the provider may have accepted the message; these attempts are never automatically sent again. Check provider records or the sender's sent folder before deliberately creating another reply. SMTP acceptance does not guarantee inbox placement.

Sending does not automatically mark the inquiry resolved. Staff separately mark **Đã phản hồi / xử lý** when the underlying customer request is handled. The existing external email link remains available as a clearly labelled alternative; messages sent through that external application are not part of the website's delivery history.

Validation uses only synthetic addresses and a local SMTP sink. No real customers receive test replies.
