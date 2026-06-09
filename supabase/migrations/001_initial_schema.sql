-- Enums
-- Note: gen_random_uuid() is built-in since PostgreSQL 13, no extension needed.
create type jetty_destination_enum as enum ('hasnur', 'talenta');
create type coal_quality_enum      as enum ('raw', 'clean');
create type trip_status_enum       as enum ('pending', 'in_transit', 'completed');
create type user_role_enum         as enum ('stockpile_operator', 'jetty_operator', 'admin');

-- Users table
create table users (
  user_id       uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          user_role_enum not null,
  created_at    timestamptz not null default now()
);

-- Trips table — 3-checkpoint workflow (CP1 → CP2 → CP3)
create table trips (
  trip_id             uuid primary key default gen_random_uuid(),
  date                date not null,
  status              trip_status_enum not null default 'pending',

  -- CP1: truck arrives at stockpile
  no_tiket            integer not null,
  no_lambung          text not null,
  jetty_destination   jetty_destination_enum not null,
  coal_quality        coal_quality_enum not null,
  cuaca_mmi           text not null,
  tare_site_kg        integer not null,
  cp1_timestamp       timestamptz,

  -- CP2: truck departs stockpile
  gross_site_kg       integer,
  netto_site_kg       integer,
  cp2_timestamp       timestamptz,

  -- CP3: truck arrives at jetty
  gross_jetty_kg      integer,
  tare_jetty_kg       integer,
  netto_jetty_kg      integer,
  compare_gross_kg    integer,
  compare_tare_kg     integer,
  deviasi_kg          integer,
  cp3_timestamp       timestamptz,

  constraint unique_truck_per_day unique (date, no_lambung)
);

create index idx_trips_date    on trips (date);
create index idx_trips_status  on trips (status);
create index idx_trips_lambung on trips (no_lambung);
