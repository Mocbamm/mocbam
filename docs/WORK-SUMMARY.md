# Mộc Bàm website: summary of work delivered

Read this first. It summarises everything built for the Mộc Bàm shop from 3 October to 20 November 2026, including work that does not appear as code in this repository. Every figure links to, or can be checked against, the repository and its history.

## At a glance

| | |
|---|---|
| Timeline | About 7 weeks: 3 Oct to 20 Nov 2026, with work on 15 separate days |
| Rounds of owner feedback | 7 rounds after the first build (listed below) |
| Releases to the live site | 54 commits on `main`; each one deploys to production |
| Code | About 29,700 lines of application code in `src/` (177 files) |
| Tests | About 11,600 lines across 52 test files (unit, database, API and browser) |
| Database | 17 migrations (`supabase/migrations/`), about 2,200 lines of SQL |
| Status | Live at `www.mocbam.com`, taking real customer orders |

The owner's requirements came mostly from her briefs in Google Docs and from Messenger messages, so they are not all stored in this repository. `docs/REQUIREMENTS.md` is an early draft from the first day and does not reflect what was later requested and built.

## Rounds of owner feedback

Each round was read or watched, turned into a checklist, built, tested and deployed. The commit messages for each round list the changes in detail.

1. **Original brief** (3 Oct): the first full build: storefront, admin, checkout and orders. Cash-on-delivery and bank-transfer payments were added the same day.
2. **24-clip video review** (5 Oct): every clip was implemented one by one. See [VIDEO-FEEDBACK.md](VIDEO-FEEDBACK.md).
3. **Written review, "Nhận xét"** (9–11 Oct): admin catalog, orders, promotions, finance and traffic reports, content, support and shipping. It was then checked twice for anything missed. See [NHAN-XET-2026-10-09.md](NHAN-XET-2026-10-09.md).
4. **Storefront feedback and redesign** (11 Oct): a full redesign in the style the owner picked, plus clearer reports.
5. **Shipping and search engines** (23–24 Oct, 3 Nov): agreed shipping prices based on J&T/GHN rates, and a fix after real customers were refused at checkout. Also free shipping, the blog editor, linking posts and products, and search-engine setup.
6. **Brief feedback** (6 Nov): storefront and admin changes, and the product-line menu.
7. **09/11 brief**: new heading font, split header, brand name, page copy, motion design and speed work.
8. **19/11 brief**: the "hạt đậu bình an" brand story across the site (32 files changed).

## What the website does

**Storefront (Vietnamese)**
- Home page with categories, product carousels, campaigns, the brand story and a contact form.
- Catalog with category and price filters, sorting, and search across products and posts (works without Vietnamese accents).
- Product pages with a photo and video gallery, variants, and "Mới" and "Nổi bật" labels.
- Cart and checkout: province and ward pickers, live shipping quote, voucher entry, and cash on delivery or bank transfer with a generated QR code.
- Order receipt with progress tracking; order history for signed-in customers.
- Blog ("Nhật ký Mộc Bàm") with a date filter; About, policy and contact pages.
- An FAQ chat assistant that hands unknown questions to staff.
- A cookie-consent banner that controls analytics.

**Customer accounts**
- Google sign-in, or email and password with a confirmation email.
- Editable profile, order history, and a private support chat.

**Admin (owner only)**
- **Products:** edit, duplicate, delete safely, filter, low-stock warnings, sold counts, variants, photos and video.
- **Orders:** fulfilment, payment and refund records with an audit trail, cancellations and returns.
- **Customers:** registered and guest customers, with order history and totals.
- **Discounts:** create vouchers and email them to customers.
- **Content:** home, About and policy pages, and posts with a rich-text editor.
- **Inbox:** contact inquiries with email replies, and the support chat.
- **Settings:** shop contacts, social links, bank details, shipping zones and the free-shipping threshold.
- **Reports:** finance (with charts and CSV export) and traffic.

**Design and speed**
- A full visual redesign, then a second restyle (fonts, header, copy) from the owner's briefs.
- Motion design for menus, panels and cart feedback.
- A speed pass that cut the phone home page download from about 3.3 MB to 0.5 MB.

**Search engines**
- Sitemap, page titles and share previews for every page, links between posts and products.

**Security and reliability (built into the code)**
- Prices, stock, discounts and shipping are re-checked on the server, so customers cannot change them in the browser.
- Database-level access rules mean no customer can read another's data or give themselves admin rights.
- Guest receipts use secret links.
- Stock changes are atomic, so two simultaneous orders cannot oversell.

## Work done outside the code

This work does not appear as features in the code. Some of it is recorded in [DEPLOYMENT.md](DEPLOYMENT.md), [PROJECT-STATUS.md](PROJECT-STATUS.md) and [LATER.md](../LATER.md).

- **Hosting:** set up Vercel and deployed every release to production.
- **Database and storage:** set up Supabase, applied 17 migrations to the live database, configured file storage, and replaced a server key.
- **Sign-in:** created the Google Cloud project, branding and sign-in client, and connected Google sign-in.
- **Email:** set up Gmail sending with a branded Vietnamese confirmation template, and tested delivery to a real inbox.
- **Domain:** connected `mocbam.com`.
- **Analytics:** set up Google Analytics 4 and verified it in real time. Created the Meta (Facebook) pixel; Meta then restricted the business account, which still needs to be resolved through Meta's appeal.
- **Search engines:** verified Google Search Console, submitted the sitemap, requested indexing for key pages, and set up Bing Webmaster Tools.
- **Shipping:** researched J&T and GHN rates for the agreed shipping prices, and applied them to the live settings.
- **Live testing:** after major releases, tested on the live site with temporary test orders, accounts, products and uploads covering checkout, payments, refunds, accounts and admin access. Every test record was then removed, without touching real data.

## How it was built

The developer directed the work and tested and deployed every release. AI coding assistants (Claude and Codex) wrote much of the code under that direction; their commits carry a co-author line.

## Handover: items that need the owner

These items are listed in [LATER.md](../LATER.md):
- Add bank details to switch on bank-transfer payments.
- Add the TikTok and Zalo links.
- Resolve the Meta account restriction.
- Set up Google Merchant Center.
- Lock blog post dates before submitting the project.
- Revoke the old Supabase server key.

The site runs on free Vercel and Supabase plans. The free Supabase project pauses after a week without activity, so check that it is running before the graduation presentation.
