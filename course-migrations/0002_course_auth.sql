CREATE TABLE IF NOT EXISTS course_login_links (
  token_hash TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS course_links_expiry ON course_login_links(expires_at);
CREATE TABLE IF NOT EXISTS course_sessions (
  token_hash TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS course_sessions_expiry ON course_sessions(expires_at);
CREATE TABLE IF NOT EXISTS course_auth_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS course_access_activity (
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  first_sign_in TEXT NOT NULL,
  last_sign_in TEXT NOT NULL,
  PRIMARY KEY(course_id, student_id)
);
