-- System-wide error reporting: station app, backend, and frontend all log
-- into one table, viewable in Admin, so problems (sync failures, print
-- failures, crashes) are visible without SSHing in or checking a console.
create table error_log (
  error_id   uuid not null default gen_random_uuid() primary key,
  source     text not null check (source in ('station', 'backend', 'frontend')),
  level      text not null default 'error' check (level in ('error', 'warn')),
  message    text not null,
  context    jsonb,
  created_at timestamptz not null default now()
);

create index idx_error_log_created on error_log (created_at desc);
create index idx_error_log_source on error_log (source);
