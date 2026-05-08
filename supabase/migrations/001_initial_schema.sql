-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Enums
create type jetty_destination_enum as enum ('hasnur', 'talenta');
create type coal_quality_enum     as enum ('raw', 'clean');
create type trip_status_enum      as enum ('in_progress', 'completed');
create type user_role_enum        as enum ('stockpile_operator', 'jetty_operator', 'admin');

-- Users table (replaces Supabase Auth)
create table users (
  user_id       uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          user_role_enum not null,
  created_at    timestamptz not null default now()
);

-- Trips table
create table trips (
  trip_id           uuid primary key default gen_random_uuid(),
  date              date not null default current_date,
  truck_id          text not null,
  jetty_destination jetty_destination_enum not null,
  coal_quality      coal_quality_enum not null,
  weather           text not null,
  gross_weight_kg   integer not null,
  pit_timestamp     timestamptz not null default now(),
  tare_weight_kg    integer,
  talenta_weight_kg integer,
  deviation_kg      integer,
  net_weight_kg     integer,
  jetty_timestamp   timestamptz,
  status            trip_status_enum not null default 'in_progress',

  unique (date, truck_id)
);

-- Indexes
create index trips_date_idx       on trips (date);
create index trips_status_idx     on trips (status);
create index trips_truck_date_idx on trips (truck_id, date);
