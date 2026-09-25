-- Daily AI call counters keyed by salted, day-scoped hashes. Rows older than two days are deleted.
CREATE TABLE IF NOT EXISTS quotas (
  day TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
