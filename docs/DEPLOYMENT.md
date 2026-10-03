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

Add optional `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_META_PIXEL_ID` only when their properties are available. Turn off GA4 Enhanced Measurement's automatic page views/form tracking in the web data stream; this app sends explicit events and excludes sensitive routes. Verify in GA4 DebugView/Tag Assistant and Meta Test Events using a browser without tracking blockers and consent granted. Do not add fake identifiers to demonstrate success.

## Rehearsal

Confirm the Supabase project is active, sign in as owner and a separate shopper, submit a test guest order, open its receipt, confirm it in admin, and verify stock. Delete/reset only clearly identified test data when preparing the final demo. Check images/contact settings, and label sample policies/data as demo content.
