ALTER TABLE trips ADD COLUMN IF NOT EXISTS jetty_date date;
CREATE INDEX IF NOT EXISTS idx_trips_jetty_date ON trips (jetty_date);
