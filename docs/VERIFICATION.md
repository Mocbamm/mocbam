# Verification

Run typecheck, lint, unit/database tests and production build. Browser tests use a local server and sample catalog. External-provider verification requires the project's real credentials and tracking IDs.

The 5 October video-feedback release passed nine hosted storefront groups, account/profile/chat isolation and admin-page checks, ten commerce/discount/media/guest-order-recovery groups, and unknown-chat/staff-inquiry delivery. All exact synthetic records/uploads/accounts were removed; original catalog, orders, settings, inquiries and permanent admin access were preserved. Migrations 003 and 004 are applied. Generated confirmation links verified app sessions without sending email; real public registration delivery was subsequently verified through custom Gmail SMTP on 5 October 2026, including confirmation, email/password login and used-link rejection. The temporary test account/profile were removed. Earlier production acceptance also passed Google owner sign-in, payment recording, paid cancellation/manual-refund warnings and refund recording. Transfer activation, real settlement and Meta setup remain deferred. See [project status](PROJECT-STATUS.md) and [LATER.md](../LATER.md).

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

## Video-feedback rehearsal

1. Search for accented and unaccented product/blog names. Verify category tiles precede product cards; carousel controls, card image cycling, **Bỏ giỏ** and **Mua ngay** work on desktop/mobile.
2. Filter journal dates, follow a whole article card, open each policy section, and check browser titles and cookie wording.
3. With a real SMTP sender configured, register using name/phone/email/password, follow the delivered confirmation, and sign in again. Edit contact details; direct profile email updates and cross-account reads must fail.
4. Save chat history in one account and reopen it. An unrelated account must see no messages. An unknown question shows hours and prefills the staff form; submit a marked inquiry and confirm it in Admin → Inquiries.
5. Submit a marked guest order using the confirmed test account's email. The unrelated account cannot claim it; the matching verified account recovers it once. Receipt access still requires the owner session or exact guest token.
6. Create marked global/private discounts. Check minimum spend, dates, caps, max uses and account restrictions. Quotes and orders calculate totals on the server; replays preserve the original snapshot/use count and reject changed payloads.
7. Upload marked PNG/MP4 media. Unattached/inactive-product media stays private; publishing exposes the gallery and supports video byte-range requests. Check **Mới**/**Nổi bật** flags.
8. Check admin customer summaries and transaction reports/CSV. Use recorded sales/payment/refund values; visitor/conversion figures need their own data source.
9. Remove only exact fixtures and compare original row fingerprints. Temporary global coupons can be disabled, made non-public and bound to the exact temporary account through the admin API before deleting that account; the FK then cascades their removal without expanding database grants.

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
