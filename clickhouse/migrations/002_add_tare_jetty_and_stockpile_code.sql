ALTER TABLE hauling_tracker.trips ADD COLUMN IF NOT EXISTS tare_jetty_kg Nullable(Int32) DEFAULT NULL;
ALTER TABLE hauling_tracker.barge_loadings ADD COLUMN IF NOT EXISTS stockpile_code String DEFAULT '';
