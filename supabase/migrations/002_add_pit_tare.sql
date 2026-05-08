-- Add pit-side tare and net weight columns
alter table trips
  add column pit_tare_weight_kg integer,
  add column pit_net_weight_kg   integer;
