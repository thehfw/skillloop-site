# SkillLoop MVP — Deploy Guide

This is a real, working app: real accounts, real saved progress, real Stripe
subscriptions. Follow these steps in order — each one only takes a few minutes.

---

## 1. Create your Supabase project (free)

1. Go to **supabase.com** → New Project.
2. Pick any name/region, set a database password (save it somewhere), create.
3. Once it's ready, go to **SQL Editor** → New query.
4. Open `supabase-schema.sql` from this project, paste the entire contents in, click **Run**.
   This creates all four tables (`profiles`, `module_progress`, `activity_log`,
   `subscriptions`), the security rules, and the auto-profile-creation trigger.
5. Go to **Project Settings → API**. You'll need three values from this page later:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click "reveal" — keep this one secret, never put it in frontend code)

6. Optional but recommended: go to **Authentication → Providers → Email** and turn
   **off** "Confirm email" while you're testing, so signups work instantly. Turn it
   back on before real families start signing up.

---

## 2. Create your Stripe products (test mode first)

1. Go to **dashboard.stripe.com** → make sure you're in **Test mode** (toggle top right).
2. Go to **Product catalog → Add product**.
   - Name: "SkillLoop Premium" → Price: $50.00/month, recurring → Save.
   - Copy the **Price ID** (starts with `price_...`) — this is `STRIPE_PRICE_PREMIUM`.
3. Repeat for "SkillLoop Standard" → $25.00/month → this is `STRIPE_PRICE_STANDARD`.
4. Go to **Developers → API keys**. Copy the **Secret key** (starts with `sk_test_...`)
   — this is `STRIPE_SECRET_KEY`. Also note the **Publishable key** (`pk_test_...`).

---

## 3. Fill in your public config

Open `js/config.js` in this project and replace the placeholders:

```js
window.SKILLLOOP_CONFIG = {
  SUPABASE_URL: 'https://your-real-project-ref.supabase.co',
  SUPABASE_ANON_KEY: 'your-real-anon-key',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_your_real_key',
};
```

These are safe to commit — the Supabase anon key is protected by the Row Level
Security rules you just ran in step 1, and Stripe's publishable key is designed
to be public.

---

## 4. Push to GitHub and connect Netlify

If this is replacing your existing site: copy every file in this project into
your existing repo (overwrite what's there), commit, and push.

If Netlify isn't already connected to this repo: **Netlify → Add new site →
Import from Git** → pick your repo → deploy settings can stay default
(publish directory `.`, this project's `netlify.toml` handles the rest).

---

## 5. Add your secret keys to Netlify

**Netlify → Site configuration → Environment variables** → add each of these
(values from steps 1 and 2):

| Key | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
| `STRIPE_SECRET_KEY` | your Stripe secret key |
| `STRIPE_PRICE_PREMIUM` | your Premium price ID |
| `STRIPE_PRICE_STANDARD` | your Standard price ID |
| `STRIPE_WEBHOOK_SECRET` | *(added in step 6 below)* |

After adding these, trigger a redeploy (**Deploys → Trigger deploy → Deploy site**)
so the functions pick them up.

---

## 6. Connect the Stripe webhook

This is what tells SkillLoop when a payment succeeds, so it can unlock Premium.

1. In Stripe: **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/stripe-webhook`
3. Select events to send: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Save, then copy the **Signing secret** (starts with `whsec_...`).
5. Add it to Netlify env vars as `STRIPE_WEBHOOK_SECRET` (step 5) and redeploy.

---

## 7. Test the whole flow end to end

1. Visit your live site → **Sign Up** → create a test account.
2. You should land on `/dashboard.html` and see 0 points, 0 active days.
3. Click into **Physical Coordination** → mark a lesson complete → you should
   see the progress ring move and a "+10 points" toast.
4. Back on the dashboard, click **Upgrade** → use Stripe's test card
   `4242 4242 4242 4242`, any future expiry, any CVC → complete checkout.
5. You should land back on the dashboard with the upgrade banner gone and a
   "Premium plan" chip in the header. Check **Stripe → Payments** to confirm
   the test charge shows up, and check the `subscriptions` table in Supabase
   (**Table Editor**) to confirm a row was written.

---

## 8. Going live

- Switch Stripe out of Test mode, create live-mode versions of both products,
  and swap the price IDs and secret key in Netlify to the live equivalents.
- Turn "Confirm email" back on in Supabase Auth settings.
- Update the webhook endpoint in Stripe to point at your production domain
  if it changes.

---

## What's real vs. what's still a placeholder

**Real and working today:**
- Account creation, login, logout (Supabase Auth)
- Persistent per-user progress, points, and active-day tracking (Postgres)
- Actual Stripe subscription checkout and webhook-driven access control

**Placeholder / next steps:**
- Independence Skills, Social Skills, and Executive Function modules (UI shows
  "Coming soon" — same pattern as Physical Coordination once content is ready)
- Avatar customization spending points on outfits (points already accrue —
  the shop UI itself isn't built yet)
- AI feedback on journal/reflection entries (Premium-gated, not yet wired to
  an AI provider)

This gives you a real foundation to demo to investors or families today, and
a clear, unambiguous list of what's next.
