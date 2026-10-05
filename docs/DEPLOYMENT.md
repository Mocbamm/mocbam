# Deployment and account setup

## Database

Create a Supabase Free project named `mocbam` in the Mộc Bàm organization/account, in Singapore. The schema explicitly grants access and enables RLS; no public role receives unrestricted order or admin-table access.

- Fresh database: apply migrations 001, 002, `202610050003_store_features.sql`, and `202610050004_customer_accounts_chat.sql` in order, then `supabase/seed.sql`.
- Existing database with migration 002 applied: apply migrations 003 and 004 once, before releasing the video-feedback revision. Do not rerun the initial migrations or seed; they are not an upgrade/reset procedure.

The hosted project has applied migrations 001–004. The video-feedback application is deployed on Vercel. Transfer remains disabled with receiving fields blank. See [project status](PROJECT-STATUS.md) for release acceptance and the outstanding SMTP setup.

Copy only these values into local/Vercel environment configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also supported)
- `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` also supported)
- `ORDER_TOKEN_SECRET`: 32+ random characters, stable across deployments so retries return the same receipt.
- `NEXT_PUBLIC_SITE_URL`: the canonical HTTPS application URL.

Do not rotate `ORDER_TOKEN_SECRET` casually: earlier idempotent checkout retries derive their tokens from it. Existing receipt tokens stored by customers still validate against their database hashes.

The replacement Supabase server key is active in Vercel Production. The previous `SECRET default` key still needs to be revoked by the owner in Supabase. This is the remaining credential cleanup action; see [project status](PROJECT-STATUS.md).

## Google login and admin

The Google Cloud project `mocbam`, branding and Web OAuth client are configured, and Supabase's Google provider is enabled. Production Google sign-in and admin access have been verified for the permanent owner `mocbamm@gmail.com`. Client credentials belong in Supabase Authentication → Providers → Google; never place the secret in public source or browser environment variables. The configuration uses these exact URLs:

| Setting                              | Value                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Google authorized JavaScript origins | `https://mocbam.vercel.app`; optionally `http://localhost:3000` for development                                                       |
| Google authorized redirect URI       | `https://ciyhftqiwbmbvnybygxy.supabase.co/auth/v1/callback`                                                                           |
| Supabase Site URL                    | `https://mocbam.vercel.app`                                                                                                           |
| Supabase allowed redirect URLs       | `https://mocbam.vercel.app/auth/callback`, `https://mocbam.vercel.app/auth/confirm`; optionally `http://localhost:3000/auth/callback` |

Run production sign-in checks from `https://mocbam.vercel.app`, matching `NEXT_PUBLIC_SITE_URL`. The PKCE verifier cookie and application callback must use the same domain; starting on another Vercel deployment hostname can prevent the callback exchange.

Request only basic identity scopes (`openid`, `email`, `profile`). Google documents an exception to Testing-mode test-user restrictions and seven-day authorization expiry for these basic identity-only requests. Additional scopes remove that exception; Google account availability and Workspace policies can still restrict access. Do not treat the Testing allowlist as an admin access control. See [Google's audience guidance](https://support.google.com/cloud/answer/15549945?hl=en).

For a new owner account, first sign in through the app and check the account in Authentication → Users. Use its exact verified user UUID in the SQL editor:

```sql
insert into public.admin_members (user_id)
values ('REPLACE_WITH_OWNER_USER_UUID')
on conflict (user_id) do nothing;
```

Only the project owner/database administrator performs this step. Shopper accounts and their metadata cannot grant membership.

## Email accounts and chat

The video-feedback revision adds email/password registration, profile editing, account chat storage and recovery of guest orders. Apply migration 004 first: it backfills profiles for existing Auth users and creates a service-only recovery function which derives ownership from a confirmed Auth email. Submitted profile metadata cannot claim orders.

Enable Email sign-in and email confirmation in Supabase Authentication. Keep the current Google configuration. Add `https://mocbam.vercel.app/auth/confirm` to allowed redirects and use a confirmation email link based on the application's confirmation endpoint:

Production currently has Email and Google enabled, email confirmation enabled, the canonical Site URL set, and both production redirects allowed. **Custom SMTP is not configured.** Supabase's default sender restricts delivery to project-team addresses; public registration needs a custom sender. Configure its SMTP host, port, username/password, sender address and sender name in Supabase before testing delivery. Supabase also requires custom SMTP to edit these templates. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Xác nhận email</a
>
```

The `/auth/callback` route remains available for PKCE exchanges and Google sign-in. Check that a real confirmation email arrives, its link signs the customer in, and ordinary email/password login works after confirmation. The application API returns confirmation instructions when Supabase does not create a session immediately. Hosted provider configuration and email delivery must be verified separately from local tests.

Signed-in chat history is private to the account, including against ordinary admin reads; guests retain a local browser history. Staff handoff uses the existing inquiry form and Admin → Inquiries, with replies through the customer's submitted email/phone. Configure `shop_hours` for the working-hours response. See `VIDEO-FEEDBACK.md` for the requirement mapping and `../LATER.md` for deferred content/setup.

## COD and manual bank transfer

COD is available by default. Receiving-account setup is deferred by the owner, so leave bank transfer disabled until those details are supplied and checked. In Admin → Settings, select the bank, enter the receiving account number and holder name, enable transfer, then save. The form, server and database require complete valid details before enabling it. These are public receiving instructions, not banking credentials; never put account passwords, PINs or OTPs in the repository or settings.

New bank orders save an immutable bank/account snapshot, server-calculated total and order transfer reference. Later settings changes affect new orders only. The server generates NAPAS/VietQR account-transfer QR images locally, with no external QR-image service or customer information in the payload. Receipts also provide the exact details for a manual transfer. Paid, refunded, cancelled and zero-total orders do not offer payment QR/instructions. Existing orders from before this migration retain method `unconfigured`.

An admin verifies the full amount received outside the website before recording `paid` with a transaction reference or reconciliation note. The database saves the admin actor, amount and timestamp in an audit entry. The website does not charge, move funds or confirm bank settlement automatically. Cancelling a paid order leaves it paid and restores stock once; refund money manually, then record `refunded` with a separate audit note. Fulfillment updates do not mark an order paid. See the [admin guide](ADMIN.md).

## Vercel

Sign in with the Mộc Bàm account, import the public GitHub repository, choose Next.js, and add the environment values above. Vercel uses the committed pnpm lockfile and Node 24. Use the default Vercel domain and committed Singapore region. After the first deployment, update `NEXT_PUBLIC_SITE_URL` and Supabase URL configuration, then redeploy.

Add optional `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_META_PIXEL_ID` only when their properties are available. These public values are embedded at build time: set them for Vercel Production, then rebuild/redeploy. Do not add fake identifiers to demonstrate success.

## Tracking provider settings

The current GA4 Measurement ID is `G-PV2R92QXC7`; production delivery has been verified through Tag Assistant and GA4 Realtime. Enhanced Measurement is off and provider-side email/URL redaction is configured. Meta setup is deferred and no Pixel ID is configured; its instructions below apply only if that work is resumed. Restore any temporary site-only blocker allowance after provider testing; the original uBlock Optimal filtering was restored after the current verification.

- **GA4:** create a Web data stream for `https://mocbam.vercel.app` and copy its Measurement ID (`G-...`), not the numeric property ID or a GTM container ID. Use Vietnam's time zone and VND for reporting. Turn Enhanced Measurement off for this explicit-event demo; if retaining any options, disable Page views → advanced → **Page changes based on browser history events** and **Form interactions**. `send_page_view: false` in code does not disable automatic history views. See [Google's pageview guide](https://developers.google.com/analytics/devguides/collection/ga4/views).
- **Meta:** use the intended numeric Pixel/dataset ID with browser events enabled. In Events Manager, keep Automatic Advanced Matching and automatic events disabled, and do not add Event Setup Tool rules that duplicate the app's events. If a traffic permission allowlist is enabled, include `mocbam.vercel.app`. This application uses browser Pixel events only; do not install a second tag or a Conversions API integration for this setup. Code disables automatic configuration and history tracking before initializing the Pixel, following the [official Meta template](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl).
- **Delivery check:** connect Google Tag Assistant to enable debug mode for the test browser, then inspect GA4 DebugView and Meta Events Manager → Test Events with consent granted and browser tracking blockers disabled. Check the correct property/Pixel, one event per intended action, and no events on account, admin, auth or receipt routes. Existing store events remain unchanged. `RemoveFromCart` and `OrderSubmitted` are Meta custom events; checkout and manual admin payment/refund records must not generate `Purchase`, including demo records. See [Google's DebugView guide](https://support.google.com/analytics/answer/7201382).

## Rehearsal

Production manual-payment acceptance, stock checks and exact QA cleanup are complete. For future rehearsals, use clearly marked verification data and check receipts/account history, stock and audit entries. These checks verify recording, not actual bank settlement. Bank-transfer activation and real bank/provider verification remain deferred until receiving details are available. Before the presentation, confirm the Supabase project is active and check images/contact settings. Remove only identified test data and label sample policies/data as demo content. See the [verification checklist](VERIFICATION.md).
