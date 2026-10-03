# Mộc Bàm — agreed scope

Vietnamese storefront with green, white and beige styling inspired by Shopify Align/Verdant, implemented as a custom app. Two categories: Dòng nhân vật and Dòng chuỗi. The brief's unannotated Shopify admin controls are inspiration, not a requirement to recreate Shopify.

Included: responsive home, catalog/search/category-price filters/sorting, product details, cart, guest checkout, optional Google accounts and order history, secure admin, About, blog, draft policies, contact inbox, curated FAQ assistant, GA4 and Meta Pixel.

Admin: products, uploaded images, stock, order fulfillment, posts, page content, inquiries, shop contact/social settings and configurable flat shipping (initially zero). One price and stock count per product; sample content first. No account can assign itself admin rights.

Checkout creates an awaiting-payment order with a receipt. Prices and stock are verified on the server. Guest receipts use secret access tokens; matching an email does not establish ownership. Payment strategy will be decided later.

Excluded from this build: payment gateways, coupons, newsletters, promotional popups, carrier integrations, AI chat, product variants and full Shopify reporting.

Two-week target: foundation/catalog first, orders and admin next, accounts/content/chat/tracking after that, then verification/documentation. Public repository: Mocbamm/mocbam. Free-tier, noncommercial deployment on Vercel and Supabase.
