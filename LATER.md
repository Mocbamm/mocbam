# Later

- [ ] Add official TikTok and Zalo URLs in **Admin → Settings**, plus Shopee if used. Facebook and Instagram are already configured in the hosted store; verify/preserve those destinations. The new footer supports all five.
- [ ] Confirm the final blog heading. **Nhật ký Mộc Bàm** is the working title.
- [ ] Review visual styling after the functional changes are accepted, as requested in video 23.

Previously deferred setup:

- [ ] Supply and verify the receiving bank/account details, then enable bank transfer in Admin → Settings.
- [ ] Resume Meta Pixel setup if needed; GA4 is already configured.

Release setup still waiting for credentials:

- [x] Configure custom SMTP and the branded confirmation template. Gmail SMTP through `mocbamm@gmail.com` is enabled; real inbox delivery, confirmation, email/password login and used-link rejection passed on 5 October 2026. The temporary test account/profile were removed.
- [ ] Revoke the previous Supabase `SECRET default` key after confirming the replacement is used everywhere. The replacement is active on Vercel; old-key revocation has not been confirmed.
