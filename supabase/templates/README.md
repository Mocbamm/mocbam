# Mộc Bàm authentication email

Use `confirm-signup.html` as the **Confirm sign up** body in Supabase → Authentication → Emails → Templates. Subject: **Xác nhận email của bạn | Mộc Bàm**. The template uses the canonical Supabase Site URL and a token hash verified by the application's `/auth/confirm` endpoint. It does not interpolate user-supplied names or include external images/tracking.

## Gmail SMTP setup

For the selected sender `mocbamm@gmail.com`:

| Setting | Value |
| --- | --- |
| Sender address | `mocbamm@gmail.com` |
| Sender name | `Mộc Bàm` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | `mocbamm@gmail.com` |
| Minimum interval | `60` seconds |
| Password | Google app password; enter directly in Supabase |

The owner must verify their Google identity, enable 2-Step Verification if needed, and create an app password named **Mộc Bàm Supabase** at [Google App passwords](https://myaccount.google.com/apppasswords?authuser=mocbamm%40gmail.com). Enter the generated password in Supabase's SMTP form and save. Never commit or send the password in chat. These settings do not belong in Vercel environment variables.

Custom SMTP must be saved before Supabase permits editing the hosted email template. Leave email confirmation enabled. Site URL must be `https://mocbam.vercel.app`; keep both `/auth/callback` and `/auth/confirm` in the allowed redirects. The default custom-SMTP rate limit is 30 emails/hour; do not increase it for the acceptance test. Supabase warns that Gmail is intended for personal email and deliverability may vary.

After saving SMTP and the template, register a disposable test address delivered to the owner, verify inbox delivery, open the confirmation, then check email/password login and resend/expired-link behavior. Local mocked tests and generated links do not prove SMTP delivery.

References: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Google app passwords](https://support.google.com/accounts/answer/185833).
