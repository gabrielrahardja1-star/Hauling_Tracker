-- Add per-jetty ended timestamps so each jetty's session can be closed independently.
-- When both are set, the backend auto-transitions the overall status to 'ended'.
alter table sessions
  add column hasnur_ended_at  timestamptz,
  add column talenta_ended_at timestamptz;
