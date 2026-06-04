create table barge_loadings (
  loading_id      uuid primary key default gen_random_uuid(),
  jetty           jetty_destination_enum not null,
  barge_name      text not null,
  tug_boat_name   text not null,
  loading_date    date not null,
  loading_qty_kg  bigint not null check (loading_qty_kg > 0),
  created_at      timestamptz not null default now()
);

create index idx_barge_loadings_jetty_date on barge_loadings (jetty, loading_date);
