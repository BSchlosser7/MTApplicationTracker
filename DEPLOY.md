# Deploying: Vercel + Supabase (free tier)

This gets the app live at a real URL, shared database for everyone who uses
it, on free tiers for both services.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free — no credit
   card required for the free tier).
2. Create a new project. Pick any name/region; save the database password
   it generates somewhere safe (you likely won't need it directly, but keep
   it).
3. Once the project finishes provisioning, go to the **SQL Editor** in the
   left sidebar, paste in the contents of [`supabase/schema.sql`](supabase/schema.sql),
   and run it. This creates all the tables and the private `documents`
   storage bucket.
4. Optionally, also run [`supabase/seed.sql`](supabase/seed.sql) the same
   way to load the 13 schools from the original spreadsheet (skips itself
   if you already have schools, e.g. from the migration step below).
5. Go to **Project Settings → API**. You'll need two values:
   - **Project URL**
   - **service_role** secret key (not the "anon"/"publishable" one)

## 2. Migrate your existing local data (if you have any)

If you've been running the app locally and already have real data in
`data/app.db` (school statuses, notes, uploaded files), bring it over:

```bash
cp .env.local.example .env.local
# fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from step 1.5 above
node scripts/migrate-to-supabase.mjs
```

This copies every school, document, activity entry, and custom field —
including the actual uploaded files — into your new Supabase project. Safe
to run once; re-running would create duplicates, so only run it a single
time.

If you don't have existing local data, just run `supabase/seed.sql` from
step 1.4 instead and skip this.

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free Hobby tier, no
   credit card required).
2. Install the Vercel CLI and deploy from this folder:
   ```bash
   npx vercel
   ```
   Follow the prompts (link to a new project, defaults are fine for a
   Next.js app).
3. Add your environment variables so the deployed app can reach Supabase:
   ```bash
   npx vercel env add SUPABASE_URL production
   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```
   Paste in the same two values from step 1.5 when prompted. Repeat with
   `preview` and `development` instead of `production` if you want preview
   deployments to work too.
   Optionally also add a shared password so randoms with the URL can't get
   in:
   ```bash
   npx vercel env add SITE_PASSWORD production
   ```
   To make the Chat page work on the deployed site, add your Anthropic API
   key too:
   ```bash
   npx vercel env add ANTHROPIC_API_KEY production
   ```
4. Deploy for real:
   ```bash
   npx vercel --prod
   ```
   Vercel prints the live URL when it finishes — that's the link to share.

## Shipping updates going forward

Whenever you make changes:

```bash
npx vercel --prod
```

That's it — no server to manage, no manual restarts, and your mom's browser
tab just shows the new version next time she loads it.

## Cost

Both Supabase and Vercel's free tiers comfortably cover this app's scale
(a couple dozen schools, a handful of documents each). Nothing here should
ever require a paid plan unless usage grows dramatically.
