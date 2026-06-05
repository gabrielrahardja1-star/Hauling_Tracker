-- A truck can make multiple trips per day, so this constraint is incorrect.
alter table trips drop constraint if exists unique_truck_per_day;
