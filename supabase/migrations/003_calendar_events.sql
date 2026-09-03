-- Adds standalone calendar events (not tied to a custom field), optionally
-- linked to a school. Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  note text,
  school_id uuid references schools(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_date on calendar_events(date);
create index if not exists idx_calendar_events_school on calendar_events(school_id);

alter table calendar_events enable row level security;
