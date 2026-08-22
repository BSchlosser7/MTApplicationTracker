# MT Application Tracker

A web app for tracking Musical Theatre BFA auditions and applications — replaces the `MT_BFA_Application_Tracker_v1.xlsx` spreadsheet with a real calendar, per-school detail pages, document uploads, and an activity log.

Deployed on **Vercel**, backed by a **Supabase** Postgres database and file storage — both on free tiers. See [DEPLOY.md](DEPLOY.md) for the full setup and deploy steps.

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project's URL + service_role key
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). There's no local database or upload folder anymore — everything reads and writes to your Supabase project, same as production. See [DEPLOY.md](DEPLOY.md) to create that project.

## What's here

- **Dashboard** (`/`) — stats, upcoming deadlines, overdue warnings, status breakdown, full school list
- **Calendar** (`/calendar`) — month grid and sorted list views of every Prescreen/Application deadline
- **Schools** (`/schools`) — searchable/filterable grid of all schools; **Schools/[id]** is the detail page with every field from the original sheet (requirements, video lengths, essay prompts, etc.), organized into sections instead of one wide row
- **Table** (`/table`) — spreadsheet-style comparison view: every school as a row, every field as a toggleable column. Pick just the fields you want to compare (e.g. only "Essay Prompts"), click a column header to sort schools by that field, and click any cell to edit it in place — changes save immediately, same as the detail page
- **Custom Fields** — add your own fields (Text, Long Text, Date, or Link) from the Table view's Columns picker or any school's detail page, no code changes needed — they show up everywhere immediately
- **Documents** — upload/download/delete files per school, grouped by category (Video, Essay, Resume, Headshot, Transcript, Other), stored in Supabase Storage
- **Activity & Notes** — automatic log of status changes, plus freeform notes, timestamped per school
- **Notifications** — a bell icon shows overdue/upcoming deadlines; the browser will also prompt for OS-level notifications when a deadline is within 3 days

## A note on `npm run build`

Don't run `npm run build` while `npm run dev` is also running against this same folder — both processes share the `.next/` build cache, and running them concurrently can destabilize the dev server's hot-reload and cause it to misbehave. Stop the dev server first if you need a production build.

## Known limitation: large file uploads

Document uploads currently pass through a Vercel serverless function, which caps request bodies at a few MB on the free tier. Small files (PDFs, headshots, short clips) are fine; a full-length audition video may fail to upload. If that becomes a real need, the fix is switching to direct browser-to-Supabase-Storage uploads via a signed upload URL — ask and I can add it.

## Adding email notifications later

In-app notifications are wired up now. To add email reminders later, hook a send into `src/lib/deadlines.ts`'s `upcomingDeadlines()` output — you'd need an email-sending service (e.g. Resend) and an API key.
