CREATE TABLE IF NOT EXISTS day_limits (
  date TEXT NOT NULL PRIMARY KEY,
  day_limit INTEGER NOT NULL CHECK (typeof(day_limit) = 'integer' AND day_limit BETWEEN 0 AND 9007199254740991)
);
