-- Postgres migration (production)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
