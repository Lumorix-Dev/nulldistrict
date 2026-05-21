# Shop Policy

Lumorix: Null District uses fair monetization.

Allowed:

- Premium currency.
- Cosmetics.
- Skins.
- Emotes.
- Pets.
- Profile banners.
- Supporter titles.
- Founder pack.
- Cosmetics-only battle pass.
- Housing cosmetics later.

Forbidden:

- Paid stronger weapons.
- Paid stronger armor.
- Paid exclusive gameplay advantages.
- Pay-to-win boosts.
- Premium currency buying power.

## Beta Payments

The beta includes two purchase lanes:

- Server-side test purchases for local beta validation.
- Stripe Checkout session creation for future real-money purchases.

No real charge is created unless:

- `STRIPE_SECRET_KEY` is configured.
- `STRIPE_WEBHOOK_SECRET` is configured.
- `PREMIUM_PURCHASES_ENABLED=true`.
- `PAYMENT_SUCCESS_URL` and `PAYMENT_CANCEL_URL` point at real support/result pages.

Stripe webhook signature verification is scaffolded in the backend. Paid grants are fulfilled from the signed webhook, not from the client. Production releases must add public support/refund links and a parental purchase warning before real payments are enabled.
