-- Alleen voor bestaande v2-databases; NIET uitvoeren na schema.sql op een nieuwe database.
ALTER TABLE employees ADD COLUMN day_off INTEGER NOT NULL DEFAULT -1;
CREATE TABLE IF NOT EXISTS periods (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'Overig');
