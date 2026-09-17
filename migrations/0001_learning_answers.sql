CREATE TABLE IF NOT EXISTS learning_answers (
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  answer TEXT NOT NULL,
  completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  prompt TEXT NOT NULL,
  PRIMARY KEY (user_id, exercise_id, version)
);
