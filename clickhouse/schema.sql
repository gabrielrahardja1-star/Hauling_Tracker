CREATE DATABASE IF NOT EXISTS hauling_tracker;

CREATE TABLE IF NOT EXISTS hauling_tracker.users (
  user_id       UUID                  DEFAULT generateUUIDv4(),
  email         String,
  password_hash String,
  role          LowCardinality(String),
  created_at    DateTime64(3, 'UTC')  DEFAULT now64(),
  _updated_at   DateTime64(3, 'UTC')  DEFAULT now64()
) ENGINE = ReplacingMergeTree(_updated_at)
ORDER BY (email);

-- Every CP1/CP2/CP3 checkpoint INSERTs a full row; FINAL deduplicates by trip_id.
-- _updated_at is the version field: ClickHouse keeps the row with the highest value.
CREATE TABLE IF NOT EXISTS hauling_tracker.trips (
  trip_id           UUID,
  date              Date,
  status            LowCardinality(String)  DEFAULT 'pending',
  no_tiket          Int32,
  no_lambung        String,
  jetty_destination LowCardinality(String),
  coal_quality      LowCardinality(String),
  cuaca_mmi         String,
  tare_site_kg      Int32,
  cp1_timestamp     Nullable(DateTime64(3, 'UTC')),
  gross_site_kg     Nullable(Int32),
  netto_site_kg     Nullable(Int32),
  cp2_timestamp     Nullable(DateTime64(3, 'UTC')),
  gross_jetty_kg    Nullable(Int32),
  tare_jetty_kg     Nullable(Int32),
  netto_jetty_kg    Nullable(Int32),
  compare_gross_kg  Nullable(Int32),
  deviasi_kg        Nullable(Int32),
  cp3_timestamp     Nullable(DateTime64(3, 'UTC')),
  adjustment_kg     Int32                   DEFAULT 0,
  is_locked         UInt8                   DEFAULT 0,
  _updated_at       DateTime64(3, 'UTC')    DEFAULT now64()
) ENGINE = ReplacingMergeTree(_updated_at)
ORDER BY (date, trip_id);

CREATE TABLE IF NOT EXISTS hauling_tracker.barge_loadings (
  loading_id      UUID                  DEFAULT generateUUIDv4(),
  jetty           LowCardinality(String),
  barge_name      String,
  tug_boat_name   String,
  loading_date    Date,
  loading_qty_kg  Int64,
  stockpile_code  String                DEFAULT '',
  created_at      DateTime64(3, 'UTC')  DEFAULT now64()
) ENGINE = MergeTree()
ORDER BY (jetty, loading_date);
