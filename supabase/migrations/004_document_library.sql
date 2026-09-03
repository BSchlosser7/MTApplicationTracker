-- Adds a general document library (essays, prescreens, etc. not tied to
-- one school) that can be attached to multiple schools without
-- re-uploading the same file. Run once in the Supabase SQL Editor.

create table if not exists document_library (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  category text not null default 'Other',
  storage_path text not null,
  mime_type text,
  size integer not null default 0,
  note text,
  uploaded_at timestamptz not null default now()
);

-- Marks a school's document row as a linked copy of a library file rather
-- than a direct upload. ON DELETE CASCADE: deleting the library file removes
-- it from every school it was attached to (it's the same physical file).
alter table documents
  add column if not exists library_document_id uuid references document_library(id) on delete cascade;

create index if not exists idx_documents_library on documents(library_document_id);

alter table document_library enable row level security;
