-- Anonymous per-day usage counters. No identifiers, no text.
CREATE TABLE IF NOT EXISTS events (
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  props TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, props)
);
