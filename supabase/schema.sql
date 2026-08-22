-- MT Application Tracker — Postgres schema for Supabase.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- All access happens server-side through the service_role key (never exposed
-- to the browser), which bypasses RLS by design. RLS is still enabled on
-- every table below as defense-in-depth: with no policies defined, the
-- anon/authenticated roles get zero access even if a client-side key ever
-- leaked.

create extension if not exists pgcrypto;

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'Not Started',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every other attribute (website, deadlines, requirements, notes, etc.) lives
-- in custom_fields/custom_field_values below — there is no fixed-vs-custom
-- distinction in this app. Add fields through the UI, not this schema.

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  category text not null default 'Other',
  filename text not null,
  storage_path text not null,
  mime_type text,
  size integer not null default 0,
  note text,
  uploaded_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  type text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists custom_fields (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type text not null default 'text',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists custom_field_values (
  school_id uuid not null references schools(id) on delete cascade,
  field_id uuid not null references custom_fields(id) on delete cascade,
  value text,
  updated_at timestamptz not null default now(),
  primary key (school_id, field_id)
);

create index if not exists idx_documents_school on documents(school_id);
create index if not exists idx_activity_school on activity_log(school_id);
create index if not exists idx_field_values_school on custom_field_values(school_id);
create index if not exists idx_field_values_field on custom_field_values(field_id);

alter table schools enable row level security;
alter table documents enable row level security;
alter table activity_log enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;

-- Storage bucket for uploaded documents (essays, videos, headshots, etc.).
-- Private bucket — files are only ever read/written via the service_role key
-- through our own API routes, never fetched directly from the browser.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
