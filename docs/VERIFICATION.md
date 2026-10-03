# Verification

Run typecheck, lint, unit/database tests and production build. Browser tests use a local server and sample catalog. External-provider verification requires the project's real credentials and tracking IDs.

Earlier production customer/admin acceptance passed Google owner sign-in, product/image management, signed-in checkout, owned order history and cancellation; its QA resources were removed and seeded data/permanent owner access retained. Hosted manual-payment migration 002 is now applied with transfer disabled and receiving fields blank. Application deployment and production verification of the manual-payment revision remain pending. Receiving-account activation and Meta setup are deferred; revocation of the previous Supabase server key remains an owner action. See [project status](PROJECT-STATUS.md).

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

## Manual payment story

1. With receiving details blank/transfer disabled, checkout defaults to COD and does not offer bank transfer. Submitting stores `cod` and `awaiting_payment`; the receipt tells the shopper to pay on delivery.
2. For a local synthetic bank fixture, enable complete valid receiving settings. Check server validation rejects incomplete details and rejects transfer requests while disabled without reserving stock. Never enable fictitious receiving accounts on production.
3. Submit a bank order; compare its saved bank/account snapshot, total including shipping and transfer reference with the receipt text and decoded QR. Confirm QR generation makes no external account-data request. Change receiving settings and verify the existing order retains its original snapshot and idempotent receipt.
4. After independently verifying the full amount received, an admin enters a reconciliation note and records `paid`. Check actor, exact amount and timestamp in the audit entry. Repeating the applied action must not create a second event or change stock. Direct payment updates by every application role, non-admin payment RPC calls and customer audit reads must be rejected.
5. Cancel a paid order: stock restores once, payment remains `paid`, and customer/admin screens explain that refund is manual. After returning money outside the website, record `refunded` with a second audit entry. Repeated refund/old paid requests must preserve the resulting state. The website itself must not move money.
6. Confirm paid/refunded/cancelled/zero-total receipts hide payable QR/bank instructions. Zero-total COD, bank and historical `unconfigured` orders must say no payment is required. Account history shows the method/status and owned bank instructions without disclosing another shopper's order or internal audit notes.
7. Existing pre-migration orders remain `unconfigured`; old HTTP retries must preserve their original order. Changing payment method for a current request must not reuse the old order. Fulfillment changes and completing a COD order do not mark it paid automatically.
8. Use clearly marked QA records for production acceptance, then remove only their exact order/product/uploads. These state checks verify recording, not actual bank settlement. Keep real shop data and permanent owner access. Actual receiving-account activation/scan testing stays deferred until the owner supplies the bank details.

## Analytics

Before consent, no GA/Meta scripts or events. After consent, one page view for each eligible navigation, one product view, one cart event per action, checkout start and `order_submitted`. These existing store events remain unchanged. Receipt/auth/admin pages, account/order-history pages (`/tai-khoan` and its descendants), and preview deployments must not be tracked. Do not send names, emails, phones, addresses, receipt tokens, authentication codes or receiving-account information. Checkout and manual payment/refund records must not emit `Purchase`, including demo records.

Use GA4 DebugView/Tag Assistant and Meta Test Events to verify destination delivery after IDs are configured. Client-stub tests prove mapping/gating; they cannot prove delivery to an unconfigured provider.

The production GA4 flow was verified with Tag Assistant and actual Realtime reception: 4 expected page views in the clean test window, product view, cart additions/removal, checkout start and one accepted unpaid order. Earlier reloads account for the Realtime `page_view` total of 6. Receipt/account visits and denied-consent routes added no page views; no `Purchase` occurred. The temporary analytics order/product/category were removed and the 8 seeded products stayed unchanged. Meta verification is deferred.

Follow the [provider settings checklist](DEPLOYMENT.md#tracking-provider-settings) before testing. Use Tag Assistant to enable GA4 debug mode for the verification browser; ordinary events do not automatically appear in DebugView. Check both providers through navigation to account, admin and receipt pages, then back to the public store. There must be no automatic history page views or duplicate manual views. Reopen cookie options, refuse consent and confirm new events stop; grant it again and confirm tracking resumes without repeating the current page view.
