-- Stage 2 weighbridge sync: track whether CP1/CP2 weights came from a manual
-- entry or were pulled from the weighbridge station's scale, and stage
-- incoming scale readings until an operator consumes them via CP1/CP2.
alter table trips add column tare_source text not null default 'manual'
  check (tare_source in ('manual', 'scale'));
alter table trips add column gross_source text not null default 'manual'
  check (gross_source in ('manual', 'scale'));

create table scale_readings_pending (
  no_lambung text not null,
  reading_type text not null check (reading_type in ('tare', 'gross')),
  weight_kg numeric not null,
  measured_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (no_lambung, reading_type)
);
