-- Seeds the 13 schools from MT_BFA_Application_Tracker_v1.xlsx.
-- Run once in the Supabase SQL Editor, after schema.sql. Safe to re-run —
-- it skips seeding if any schools already exist.

insert into schools (name, status, sort_order)
select v.name, 'Not Started', v.sort_order
from (values
  ('Carnegie Mellon University', 0),
  ('University of Michigan', 1),
  ('Penn State University', 2),
  ('Elon University', 3),
  ('Texas State University', 4),
  ('Florida State University', 5),
  ('Emerson College', 6),
  ('Syracuse University', 7),
  ('Shenandoah University', 8),
  ('Boston Conservatory', 9),
  ('Cincinnati Conservatory of Music', 10),
  ('Oberlin College', 11),
  ('Pace University', 12)
) as v(name, sort_order)
where not exists (select 1 from schools);
