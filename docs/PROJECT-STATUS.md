# Project status

Last verified: 3 October 2026. Core production customer/admin acceptance and verification-data cleanup are complete. Revocation of the previous Supabase server key remains an owner action.

## Deployment

- Live storefront: [mocbam.vercel.app](https://mocbam.vercel.app).
- Repository: [Mocbamm/mocbam](https://github.com/Mocbamm/mocbam), `main`.
- Vercel: project `mocbam`, Hobby plan, production deployment Ready, functions in Singapore (`sin1`).
- Supabase: Mộc Bàm organization, Free plan, Singapore; project reference `ciyhftqiwbmbvnybygxy`. Migration and seed applied: 8 products, 2 posts and 6 editable content records; initial flat shipping fee is 0₫.
- GA4: account `410553554`, property `557218756`, Web stream `16000604251`, Measurement ID `G-PV2R92QXC7`, configured on production. Enhanced Measurement is off; email and URL parameters `token`, `code`, `email`, `phone` and `address` have redaction enabled. Actual event delivery was verified through Tag Assistant and GA4 Realtime.
- Google Cloud: project `mocbam`, app branding and Web OAuth client configured; Supabase's Google provider is enabled. The verified owner `mocbamm@gmail.com` is permanently enrolled in `admin_members`.

The initial catalog, artwork, contact information and policies remain demonstration content. Orders remain `awaiting_payment`; payment integration is deferred and the website does not collect payment. Meta Pixel setup is explicitly deferred by the project owner; no Pixel ID is configured.

## Verified

- At source commit `29a310a`, the production build and GitHub CI passed; 43 unit/database tests and 9 browser tests passed. CI checks TypeScript, lint, unit/database tests, a production build and browser tests.
- Local API checks confirmed contact submission persists in Supabase, anonymous admin reads/updates and order history are rejected, malformed checkout is rejected, and unknown receipts/unpublished media are inaccessible. The temporary verification inquiry was removed.
- Eight hosted Supabase verification groups passed, including real concurrent checkout checks, row-level access controls, cancellation/stock behavior and storage access. Temporary verification resources were cleaned up.
- Nine production HTTP verification groups passed, covering product/post management, image upload and visibility, content, settings, inquiry resolution and order updates. A regular signed-in customer was denied access in all 17 admin read/write checks. Temporary HTTP verification resources were removed; settings were checked using their existing values.
- Production browser checks confirmed owner Google sign-in and admin access, creation of an active product with an uploaded image, signed-in checkout, the awaiting-payment receipt and the order appearing in the owner's account history. Admin cancellation changed order MB-8 to `cancelled`; its database payment status remained `awaiting_payment`, stock returned to 3, and its owner user ID matched the Google owner with permanent admin membership.
- Exact cleanup removed the owner verification order, product and both uploaded image objects. No owner QA resources remain. All 8 seeded products, 2 categories, 2 posts and 6 content rows remained byte-for-byte unchanged; permanent owner/admin membership was retained.
- A browser checkout on the production deployment persisted one 99,000₫ guest order, reserved stock, cleared the cart and displayed its awaiting-payment receipt. Production APIs rejected anonymous admin/history access; the synthetic order and temporary product were removed.
- The latest production deployment passed anonymous access checks for every admin collection and customer order history. Unknown receipt requests disclose no order data; receipt pages use no-store, no-referrer and noindex headers.
- A replacement Supabase server key was saved in Vercel Production and verified through a persisted contact inquiry; the temporary inquiry was removed.
- Production GA4 delivery was verified in Tag Assistant and GA4 Realtime: `page_view` 6 (including 2 earlier reloads), `view_item` 1, `add_to_cart` 2, `remove_from_cart` 1, `begin_checkout` 1 and `order_submitted` 1; no `Purchase`. The clean verification window contained the expected 4 page views: About after consent, product, cart and checkout. Receipt/account visits and denied-consent routes added no page views.
- The analytics guest checkout created temporary order MB-6 for 99,000₫, shipping 0₫, quantity 1 and `awaiting_payment`; stock changed from 3 to 2. Exact guarded cleanup removed only its order, product and category. All 8 seeded product rows remained unchanged.
- Chrome's uBlock Origin Lite initially replaced the Google tag with an extension stub. A temporary site-only allowance enabled provider testing; the original Optimal filtering on `mocbam.vercel.app` was restored and confirmed after verification.

## Remaining owner action and deferred work

- The owner still needs to revoke the previous Supabase `SECRET default` server key. The replacement is active; revocation of the old key has not been confirmed.
- Meta Pixel setup/provider verification and payment integration remain explicitly deferred by the project owner.

Check the Supabase Free project is active before the graduation presentation. The [verification checklist](VERIFICATION.md) documents the flows to rehearse after future changes.
