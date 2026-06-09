-- Add sessions table and link trips to sessions.
-- For now, sessions are auto-grouped by date (one per day).
-- In the future, sessions will be managed manually.

create type session_status_enum as enum ('active', 'ended');

create table sessions (
  session_id   uuid                not null default gen_random_uuid() primary key,
  session_date date                not null,
  status       session_status_enum not null default 'active',
  ended_at     timestamptz,
  created_at   timestamptz         not null default now()
);

create index idx_sessions_date   on sessions (session_date);
create index idx_sessions_status on sessions (status);

-- Add session_id FK to trips
alter table trips add column session_id uuid references sessions(session_id);

-- Backfill: create one session per distinct date from existing trips (all historical = ended)
insert into sessions (session_date, status, ended_at, created_at)
select
  t.date,
  'ended',
  max(t.cp2_timestamp),
  min(t.cp1_timestamp)
from trips t
group by t.date;

-- Link each trip to its backfilled session
update trips t
set session_id = s.session_id
from sessions s
where s.session_date = t.date;
