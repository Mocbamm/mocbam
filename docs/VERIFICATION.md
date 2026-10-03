# Verification

Run typecheck, lint, unit/database tests and production build. Browser tests use a local server and sample catalog. External-provider verification requires the project's real credentials and tracking IDs.

Embedded PostgreSQL verifies real SQL, transactions and RLS. It serializes a single session, so the stock competition cases do not prove hosted multi-session lock contention. Run a concurrent checkout test against the configured Supabase demo before assessment.

## Customer/admin story

1. Browse on desktop and mobile; filter each collection, search, sort and open a product.
2. Add/update/remove cart items and reload; invalid persisted quantities must not survive.
3. Submit a guest order. Inspect its real database row, stock decrement and awaiting-payment receipt.
4. Retry the same request: one order and one stock reservation. A changed payload with the same key must fail.
5. Cancel once in admin: stock returns once; repeat cancellation must not increase stock again.
6. Sign in as a shopper: view only owned orders. A different account and an invalid/missing guest token cannot read the order.
7. Visit admin signed out/as a shopper; test its APIs directly too. All modifications and uploads must reject unauthorized requests.
8. Update a product/post/content record, confirm storefront output, and submit/read a contact inquiry.

## Analytics

Before consent, no GA/Meta scripts or events. After consent, one page view for each eligible navigation, one product view, one cart event per action, checkout start and order submission. Receipt/auth/admin pages and preview deployments must not be tracked. Do not send names, emails, phones, addresses, receipt tokens or authentication codes. No `Purchase` event exists while payments are deferred.

Use GA4 DebugView/Tag Assistant and Meta Test Events to verify destination delivery after IDs are configured. Client-stub tests prove mapping/gating; they cannot prove delivery to an unconfigured provider.
