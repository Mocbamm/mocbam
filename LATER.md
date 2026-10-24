# Later

- [ ] Add official TikTok and Zalo URLs in **Admin → Settings**, plus Shopee if used. Facebook and Instagram are already configured in the hosted store; verify/preserve those destinations. The new footer supports all five.
- [ ] Confirm the final blog heading. **Nhật ký Mộc Bàm** is the working title.
- [ ] Review visual styling after the functional changes are accepted, as requested in video 23.
- [x] Google Search Console (24/10/2026): `https://www.mocbam.com/` is verified under mocbamm@gmail.com (auto-verified through the domain's DNS record), the sitemap is resubmitted, and indexing was requested for the home page, `/san-pham`, `/blog`, both posts and 5 products. Daily quota ran out before `chuoi-hat-an-yen`, `moc-khoa-nha-go` and `chuoi-may-nho`; request those in URL inspection on another day (the sitemap covers them anyway). Check **Pages** and **Enhancements** (Product, Breadcrumb) after a few days.
- [x] Search engines (24/10/2026): Google Analytics is linked to the `mocbam.com` Domain property in Search Console; Bing Webmaster Tools imported `www.mocbam.com` from Search Console and has the sitemap. Cốc Cốc reads the sitemap from `robots.txt` (no account needed); its manual URL form needs a reCAPTCHA, so submit the home page there by hand.
- [ ] Google Merchant Center (free Shopping listings): blocked on shipping. The shop delivers itself within ~3 km and uses a third-party carrier beyond that, so there is no fixed price yet, and checkout still only accepts the listed wards (`shipping_zones_only`) while the shipping policy page says "giao hàng toàn quốc". Decide a nationwide rate (e.g. a flat fee for carrier orders), set it in Admin → Settings, align the policy text, then set up Merchant Center with the same rate. The return policy is already in the structured data.
- [ ] Optionally create a Google Business Profile for Mộc Bàm and link the site.
- [ ] Lock blog post dates before handing in the project (owner request, 24/10/2026): set `postDateEditable = false` in `src/lib/features.ts` and redeploy. The date field disappears and the API refuses date changes.

Previously deferred setup:

- [ ] Supply and verify the receiving bank/account details, then enable bank transfer in Admin → Settings.
- [ ] Resolve Meta's restriction on portfolio Mộc Bàm (`3533394066834013`), then finish setup using the existing **Moc Bam Website Pixel** dataset. Set its numeric ID in Vercel Production, rebuild and verify Test Events; GA4 is already configured. See [project status](docs/PROJECT-STATUS.md) for the restriction details.

Release setup still waiting for credentials:

- [x] Configure custom SMTP and the branded confirmation template. Gmail SMTP through `mocbamm@gmail.com` is enabled; real inbox delivery, confirmation, email/password login and used-link rejection passed on 5 October 2026. The temporary test account/profile were removed.
- [ ] Revoke the previous Supabase `SECRET default` key after confirming the replacement is used everywhere. The replacement is active on Vercel; old-key revocation has not been confirmed.
