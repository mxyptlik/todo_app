-- Readable schema snapshot for a new Daylist PostgreSQL database.
-- Versioned files in db/migrations/ remain the authoritative migration path.

CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_for TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 1440),
  meeting_url TEXT CHECK (meeting_url IS NULL OR char_length(meeting_url) <= 2048),
  venue TEXT CHECK (venue IS NULL OR char_length(btrim(venue)) BETWEEN 1 AND 200),
  reminder_minutes INTEGER CHECK (reminder_minutes IS NULL OR reminder_minutes IN (0, 5, 10, 15, 30, 60, 1440, 10080)),
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS todos_reminder_due_idx
  ON todos (scheduled_for)
  WHERE scheduled_for IS NOT NULL AND reminder_minutes IS NOT NULL AND reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_events (
  id BIGSERIAL PRIMARY KEY,
  todo_id INTEGER NOT NULL UNIQUE REFERENCES todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notification_events_unread_idx
  ON notification_events (sent_at DESC)
  WHERE read_at IS NULL;
