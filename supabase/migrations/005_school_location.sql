-- Adds optional geocoded location to schools, for the Map view.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table schools add column if not exists latitude double precision;
alter table schools add column if not exists longitude double precision;
