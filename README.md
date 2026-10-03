# Mộc Bàm

A Vietnamese graduation-project shop: Next.js App Router, TypeScript, Tailwind CSS/shadcn/ui and Supabase. The public storefront and protected admin are one application. Payment-gateway selection is deferred; submitting an order does not collect money.

Live demo: [mocbam.vercel.app](https://mocbam.vercel.app). See [project status](docs/PROJECT-STATUS.md) for deployed resources, completed checks and remaining setup.

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
2. Run the files in `supabase/migrations/` in timestamp order using the SQL editor or Supabase CLI, then run `supabase/seed.sql`.
3. Put the project URL, publishable key, server secret/service-role key and a random 32-byte `ORDER_TOKEN_SECRET` in `.env.local`. Server secrets must never use a `NEXT_PUBLIC_` prefix.
4. Enable Google under Authentication → Providers. Configure a Google Web OAuth client with Supabase's callback URL. Use only basic profile/email scopes. Set the Supabase Site URL to the deployed application and allow `http://localhost:3000/auth/callback` for local development.
5. Sign in through the application. Grant the intended account admin membership using the SQL snippet in [deployment setup](docs/DEPLOYMENT.md). Never grant roles based on browser metadata or client input.

Products use one price/stock count each. Checkout recalculates database prices, reserves stock atomically and supports idempotent retries. Cancelling an order restores stock once. Payment status remains `awaiting_payment`. Registered shoppers see their own orders; guest receipts require an opaque token.

## Admin

Open `/admin` after signing in with an account in `admin_members`. Manage products/images/stock, fulfillment, blog posts, page content, contact inquiries and store settings. Image uploads stay private until used by an active product or published post. See [admin guide](docs/ADMIN.md).

## Tracking

Set `NEXT_PUBLIC_GA_ID` and/or `NEXT_PUBLIC_META_PIXEL_ID` on the production deployment. Tracking is opt-in and disabled on admin, authentication, account/order-history (`/tai-khoan`), receipt and ordinary preview routes. The event layer sends views, cart additions/removals (including quantity deltas), checkout starts and `order_submitted`; Meta uses the custom `RemoveFromCart` event for removals and `OrderSubmitted` for accepted orders. It never sends a purchase for an unpaid order. Personal contact and address information are excluded. See [provider setup](docs/DEPLOYMENT.md) and the [verification guide](docs/VERIFICATION.md).

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
