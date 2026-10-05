-- Used only by explicit local/simulation adapters, never live email fallback.
CREATE TABLE IF NOT EXISTS course_mock_mail (
  id INTEGER PRIMARY KEY,
  course_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (json_valid(body))
);
