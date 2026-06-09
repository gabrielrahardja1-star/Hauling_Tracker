-- Add separate site/jetty lock flags to sessions.
-- site_locked  → blocks CP1/CP2 edits for all trips in the session.
-- jetty_locked → blocks CP3 edits for all trips in the session.

alter table sessions
  add column site_locked    boolean   not null default false,
  add column site_locked_at timestamptz,
  add column jetty_locked   boolean   not null default false,
  add column jetty_locked_at timestamptz;
