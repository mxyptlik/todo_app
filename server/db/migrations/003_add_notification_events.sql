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
