CREATE TABLE IF NOT EXISTS saves (
  player_id TEXT PRIMARY KEY,
  nickname TEXT,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  player_id TEXT PRIMARY KEY,
  nickname TEXT,
  level INTEGER NOT NULL,
  money INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
