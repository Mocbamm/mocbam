# Project status

Last verified: 3 October 2026. This records the current deployment and checks; final acceptance is still pending.

## Deployment

- Live storefront: [mocbam.vercel.app](https://mocbam.vercel.app).
- Repository: [Mocbamm/mocbam](https://github.com/Mocbamm/mocbam), `main`, application commit `ef34c1d`.
- Vercel: project `mocbam`, Hobby plan, production deployment Ready, functions in Singapore (`sin1`).
- Supabase: Mộc Bàm organization, Free plan, Singapore; project reference `ciyhftqiwbmbvnybygxy`. Migration and seed applied: 8 products, 2 posts and 6 editable content records; initial flat shipping fee is 0₫.

The initial catalog, artwork, contact information and policies remain demonstration content. Orders remain `awaiting_payment`; the website does not collect payment.

## Verified

- TypeScript, lint and production build passed; 38 unit/database tests and 9 browser tests passed. GitHub CI passed for the initial application commit; the analytics follow-up is checked separately by CI.
- Local API checks confirmed contact submission persists in Supabase, anonymous admin reads/updates and order history are rejected, malformed checkout is rejected, and unknown receipts/unpublished media are inaccessible. The temporary verification inquiry was removed.
- Eight hosted Supabase verification groups passed, including real concurrent checkout checks, row-level access controls, cancellation/stock behavior and storage access. Temporary verification resources were cleaned up.
- A browser checkout on the production deployment persisted one 99,000₫ guest order, reserved stock, cleared the cart and displayed its awaiting-payment receipt. Production APIs rejected anonymous admin/history access; the synthetic order and temporary product were removed.

## Remaining setup and acceptance

- Configure Google OAuth and grant the intended owner membership in `admin_members`; verify real owner and shopper sign-in through the deployed app.
- Configure GA4 and Meta Pixel identifiers, then verify consent and actual event delivery in the providers' tools.
- Complete the final production end-to-end customer/admin flow after external configuration is finished, including checkout, receipt, fulfillment, content changes and contact handling. See [verification checklist](VERIFICATION.md).

Passing local and hosted component checks does not establish complete production acceptance. Check the Supabase Free project is active before the graduation presentation.
