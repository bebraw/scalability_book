CREATE TABLE IF NOT EXISTS course_records (
  key TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL CHECK (json_valid(body)),
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  actor TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS course_records_course ON course_records(course_id, key);
CREATE INDEX IF NOT EXISTS course_records_kind ON course_records(kind, key);
CREATE TABLE IF NOT EXISTS course_history (
  key TEXT NOT NULL,
  revision TEXT NOT NULL,
  body TEXT NOT NULL CHECK (json_valid(body)),
  updated_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (key, revision)
);
