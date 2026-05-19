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

The beta includes a test purchase route. No real charge is created unless:

- `STRIPE_SECRET_KEY` is configured.
- `STRIPE_WEBHOOK_SECRET` is configured.
- `PREMIUM_PURCHASES_ENABLED=true`.

Stripe webhook signature verification is scaffolded in the backend. Production releases must add public support/refund links and a parental purchase warning before real payments are enabled.
