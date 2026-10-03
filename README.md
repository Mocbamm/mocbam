# Mộc Bàm

A Vietnamese graduation-project shop: Next.js App Router, TypeScript, Tailwind CSS/shadcn/ui and Supabase. The public storefront and protected admin are one application. Payments use COD or manual bank transfer with a locally generated QR; submitting an order does not move money or confirm receipt of payment.

Live demo: [mocbam.vercel.app](https://mocbam.vercel.app). Production HTTP and browser verification using the owner account passed COD checkout, payment recording, paid cancellation and refund recording. QA resources were removed; seeded data and permanent owner access were retained. See [project status](docs/PROJECT-STATUS.md).

## Run locally

Use Node.js 24 LTS and pnpm 11.19.0.

```sh
npm install -g pnpm@11.19.0
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Without Supabase credentials the storefront displays editable-source sample data; order submission, contact persistence, login and admin remain unavailable. This is a read-only preview, not an in-memory fake database.

## Connect Supabase

1. Create a Free organization/project in Singapore (`ap-southeast-1`). Keep the Data API enabled and automatic exposure of new tables disabled. Save the database password in your password manager.
2. For a fresh database, apply `202610030001_initial.sql`, then `202610030002_manual_payments.sql`, then `supabase/seed.sql`. For an existing database with migration 001 applied, apply migration 002 once; do not rerun 001 or the seed. Use the SQL editor or Supabase CLI.
3. Put the project URL, publishable key, server secret/service-role key and a random 32-byte `ORDER_TOKEN_SECRET` in `.env.local`. Server secrets must never use a `NEXT_PUBLIC_` prefix.
4. Enable Google under Authentication → Providers. Configure a Google Web OAuth client with Supabase's callback URL. Use only basic profile/email scopes. Set the Supabase Site URL to the deployed application and allow `http://localhost:3000/auth/callback` for local development.
5. Sign in through the application. Grant the intended account admin membership using the SQL snippet in [deployment setup](docs/DEPLOYMENT.md). Never grant roles based on browser metadata or client input.

Products use one price/stock count each. Checkout recalculates database prices, reserves stock atomically and supports idempotent retries. Cancelling an order restores stock once. Registered shoppers see their own orders; guest receipts require an opaque token.

## Payments

COD is the default checkout method. Bank transfer is ready in the application but remains disabled because the owner has deferred receiving-account setup. To enable it later, save valid receiving details and enable transfer in Admin → Settings. Each bank order keeps an immutable copy of its receiving bank/account, total and transfer reference. The server generates its QR locally; customer or bank-account data is not sent to an external QR service.

Orders start as `awaiting_payment`. An admin records `paid` only after independently checking the full amount received; the action stores an audit note, actor and timestamp. Cancelling a paid order preserves its paid status and requires a manual refund outside the website. After that refund, an admin records `refunded` with another audit entry. Fulfillment and payment remain separate. Historical orders retain `unconfigured` as their method. Zero-total orders do not require payment or display transfer instructions. There is no automatic gateway, bank confirmation or money-transfer integration.

## Admin

Open `/admin` after signing in with an account in `admin_members`. Manage products/images/stock, fulfillment, blog posts, page content, contact inquiries and store settings. Image uploads stay private until used by an active product or published post. See [admin guide](docs/ADMIN.md).

Google sign-in is configured, and the permanent owner admin `mocbamm@gmail.com` has verified production access, product/image management, signed-in checkout, account order history and order cancellation. Verification data has been removed; the seeded catalog and permanent owner access are retained.

## Tracking

GA4 Measurement ID `G-PV2R92QXC7` is configured on production. Enhanced Measurement is off; email and the URL parameters `token`, `code`, `email`, `phone` and `address` have provider-side redaction enabled. Actual production events were verified in Tag Assistant and GA4 Realtime, including product views, cart changes, checkout start and an accepted unpaid order. No `Purchase` was sent. The site's original uBlock filtering was restored after verification. Meta Pixel configuration is deferred by the project owner; no Pixel ID is configured.

Tracking is opt-in and disabled on admin, authentication, account/order-history (`/tai-khoan`), receipt and ordinary preview routes. The existing event layer remains unchanged: views, cart additions/removals (including quantity deltas), checkout starts and `order_submitted`; its optional Meta mapping uses the custom `RemoveFromCart` event for removals and `OrderSubmitted` for accepted orders. Manual payment/refund records do not emit `Purchase`. Personal contact and address information are excluded. See [provider setup](docs/DEPLOYMENT.md) and the [verification guide](docs/VERIFICATION.md).

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The database tests use embedded PostgreSQL for transaction, inventory, idempotency and row-access behavior. Browser checks exercise the storefront and setup states; live authentication and hosted analytics also need the configured external accounts.

## Hosting

Import `Mocbamm/mocbam` into Vercel using the Mộc Bàm account. `vercel.json` places server functions in Singapore. Add environment values and deploy; update Supabase authentication redirect URLs to the resulting domain. Use Vercel Hobby only for this noncommercial demo. Supabase Free may pause when inactive; resume/check it before assessment. [Deployment steps](docs/DEPLOYMENT.md).

Sample products, descriptions, contact details, artwork and policies are illustrative. Replace them through admin before presenting the project as a real shop. No credentials from the source brief are stored in this repository.
