# Mộc Bàm — agreed scope

Vietnamese storefront with green, white and beige styling inspired by Shopify Align/Verdant, implemented as a custom app. Two categories: Dòng nhân vật and Dòng chuỗi. The brief's unannotated Shopify admin controls are inspiration, not a requirement to recreate Shopify.

Included: responsive home, catalog/search/category-price filters/sorting, product details, cart, guest checkout, optional Google accounts and order history, secure admin, About, blog, draft policies, contact inbox, curated FAQ assistant, GA4 and Meta Pixel.

Admin: products, uploaded images, stock, order fulfillment, manual full-payment/refund reconciliation with audit notes/actor/timestamps, posts, page content, inquiries, shop contact/social settings, configurable flat shipping (initially zero) and receiving-bank settings. One price and stock count per product; sample content first. No account can assign itself admin rights.

Checkout defaults to COD and creates an awaiting-payment order with a receipt. Manual bank transfer is offered only when valid receiving details are saved and enabled by the owner; account setup/activation is currently deferred. Prices and stock are verified on the server. Each bank order keeps an immutable receiving-account snapshot and exact total/reference, with a locally generated QR and manual transfer instructions. No bank-account or customer data goes to an external QR service. Guest receipts use secret access tokens; matching an email does not establish ownership. Historical orders retain method `unconfigured`; zero-total orders do not require payment.

An admin records `paid` only after verifying the full payment actually received. Cancelling a paid order preserves its payment status and restores stock once; money must be refunded outside the website before the admin records `refunded`. Both actions leave audit entries and remain separate from fulfillment. Customer clicks cannot mark an order paid. Existing consent-based GA4/optional Meta events remain unchanged; manual payment/refund records do not emit `Purchase`, and receipt/admin/account routes remain excluded.

Excluded from this build: automatic payment gateways/bank settlement or money transfers, partial payments/refunds, coupons, newsletters, promotional popups, carrier integrations, AI chat, product variants and full Shopify reporting. Meta provider setup remains deferred; code support is included.

Two-week target: foundation/catalog first, orders and admin next, accounts/content/chat/tracking after that, then verification/documentation. Public repository: Mocbamm/mocbam. Free-tier, noncommercial deployment on Vercel and Supabase.
