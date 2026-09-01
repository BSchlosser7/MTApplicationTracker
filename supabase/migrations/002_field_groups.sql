-- Adds field groups, so custom fields can be organized into named,
-- reorderable sections (e.g. "Prescreen", "In-Person Audition").
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists field_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table custom_fields
  add column if not exists group_id uuid references field_groups(id) on delete set null;

create index if not exists idx_custom_fields_group on custom_fields(group_id);

alter table field_groups enable row level security;
