CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  user_email  TEXT NOT NULL,
  action      TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX audit_log_record_id_idx ON audit_log (record_id);
CREATE INDEX audit_log_created_at_idx ON audit_log (created_at DESC);
