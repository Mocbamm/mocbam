# Deployment and account setup

## Database

Create a Supabase Free project named `mocbam` in the Mộc Bàm organization/account, in Singapore. Run the committed migration files, then `supabase/seed.sql`. The schema explicitly grants access and enables RLS; no public role receives unrestricted order or admin-table access.

Copy only these values into local/Vercel environment configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also supported)
- `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` also supported)
- `ORDER_TOKEN_SECRET`: 32+ random characters, stable across deployments so retries return the same receipt.
- `NEXT_PUBLIC_SITE_URL`: the canonical HTTPS application URL.

Do not rotate `ORDER_TOKEN_SECRET` casually: earlier idempotent checkout retries derive their tokens from it. Existing receipt tokens stored by customers still validate against their database hashes.

## Google login and admin

Create a Google OAuth Web client, configure Supabase's `/auth/v1/callback` as its authorized redirect URI, then add its client ID/secret to the Supabase Google provider. Set Supabase's Site URL to the application; add the exact app `/auth/callback` URLs used for production/local development. If Google's consent app is in testing, add demo users to the permitted test users list.

After the owner signs in through the app, check the account in Authentication → Users. Use its exact verified user UUID in the SQL editor:

```sql
insert into public.admin_members (user_id)
values ('REPLACE_WITH_OWNER_USER_UUID')
on conflict (user_id) do nothing;
```

Only the project owner/database administrator performs this step. Shopper accounts and their metadata cannot grant membership.

## Vercel

Sign in with the Mộc Bàm account, import the public GitHub repository, choose Next.js, and add the environment values above. Vercel uses the committed pnpm lockfile and Node 24. Use the default Vercel domain and committed Singapore region. After the first deployment, update `NEXT_PUBLIC_SITE_URL` and Supabase URL configuration, then redeploy.

Add optional `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_META_PIXEL_ID` only when their properties are available. These public values are embedded at build time: set them for Vercel Production, then rebuild/redeploy. Do not add fake identifiers to demonstrate success.

## Tracking provider settings

- **GA4:** create a Web data stream for `https://mocbam.vercel.app` and copy its Measurement ID (`G-...`), not the numeric property ID or a GTM container ID. Use Vietnam's time zone and VND for reporting. Turn Enhanced Measurement off for this explicit-event demo; if retaining any options, disable Page views → advanced → **Page changes based on browser history events** and **Form interactions**. `send_page_view: false` in code does not disable automatic history views. See [Google's pageview guide](https://developers.google.com/analytics/devguides/collection/ga4/views).
- **Meta:** use the intended numeric Pixel/dataset ID with browser events enabled. In Events Manager, keep Automatic Advanced Matching and automatic events disabled, and do not add Event Setup Tool rules that duplicate the app's events. If a traffic permission allowlist is enabled, include `mocbam.vercel.app`. This application uses browser Pixel events only; do not install a second tag or a Conversions API integration for this setup. Code disables automatic configuration and history tracking before initializing the Pixel, following the [official Meta template](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl).
- **Delivery check:** connect Google Tag Assistant to enable debug mode for the test browser, then inspect GA4 DebugView and Meta Events Manager → Test Events with consent granted and browser tracking blockers disabled. Check the correct property/Pixel, one event per intended action, and no events on account, admin, auth or receipt routes. `RemoveFromCart` and `OrderSubmitted` are Meta custom events; unpaid orders must not generate `Purchase`. See [Google's DebugView guide](https://support.google.com/analytics/answer/7201382).

## Rehearsal

Confirm the Supabase project is active, sign in as owner and a separate shopper, submit a test guest order, open its receipt, confirm it in admin, and verify stock. Delete/reset only clearly identified test data when preparing the final demo. Check images/contact settings, and label sample policies/data as demo content.
