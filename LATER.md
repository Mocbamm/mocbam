# Later

- [ ] Add official TikTok and Zalo URLs in **Admin → Settings**, plus Shopee if used. Facebook and Instagram are already configured in the hosted store; verify/preserve those destinations. The new footer supports all five.
- [ ] Confirm the final blog heading. **Nhật ký Mộc Bàm** is the working title.
- [ ] Review visual styling after the functional changes are accepted, as requested in video 23.
- [x] Google Search Console (24/10/2026): `https://www.mocbam.com/` is verified under mocbamm@gmail.com (auto-verified through the domain's DNS record), the sitemap is resubmitted, and indexing was requested for the home page, `/san-pham`, `/blog`, both posts and 5 products. Daily quota ran out before `chuoi-hat-an-yen`, `moc-khoa-nha-go` and `chuoi-may-nho`; request those in URL inspection on another day (the sitemap covers them anyway). Check **Pages** and **Enhancements** (Product, Breadcrumb) after a few days.
- [x] Search engines (24/10/2026): Google Analytics is linked to the `mocbam.com` Domain property in Search Console; Bing Webmaster Tools imported `www.mocbam.com` from Search Console and has the sitemap. Cốc Cốc reads the sitemap from `robots.txt` (no account needed); its manual URL form needs a reCAPTCHA, so submit the home page there by hand.
- [ ] Shipping prices agreed 24/10/2026 (owner approved, based on J&T/GHN public standard rates: HCMC 21–30.5k, provinces 29–39k incl. VAT). After migration `202610240016` is applied and the free-shipping release is deployed, set in Admin → Cài đặt → Giao hàng: "only listed areas" off; default fee 40.000 (other provinces); zone Tăng Nhơn Phú 0; zone Thành phố Hồ Chí Minh (no wards) 30.000; delete the 3–7 km and 7–15 km zones; free shipping from 1.500.000. Update the "Giao hàng" policy text to match. Then set up Google Merchant Center: Vietnam, flat 40.000, free from 1.500.000 (overstating HCMC is allowed). Check the first few real carrier invoices against these prices.
- [ ] Optionally create a Google Business Profile for Mộc Bàm and link the site.
- [ ] Lock blog post dates before handing in the project (owner request, 24/10/2026): set `postDateEditable = false` in `src/lib/features.ts` and redeploy. The date field disappears and the API refuses date changes.

Previously deferred setup:

- [ ] Supply and verify the receiving bank/account details, then enable bank transfer in Admin → Settings.
- [ ] Resolve Meta's restriction on portfolio Mộc Bàm (`3533394066834013`), then finish setup using the existing **Moc Bam Website Pixel** dataset. Set its numeric ID in Vercel Production, rebuild and verify Test Events; GA4 is already configured. See [project status](docs/PROJECT-STATUS.md) for the restriction details.

Release setup still waiting for credentials:

- [x] Configure custom SMTP and the branded confirmation template. Gmail SMTP through `mocbamm@gmail.com` is enabled; real inbox delivery, confirmation, email/password login and used-link rejection passed on 5 October 2026. The temporary test account/profile were removed.
- [ ] Revoke the previous Supabase `SECRET default` key after confirming the replacement is used everywhere. The replacement is active on Vercel; old-key revocation has not been confirmed.
