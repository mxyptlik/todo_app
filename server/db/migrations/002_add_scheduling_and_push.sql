ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 1440),
  ADD COLUMN IF NOT EXISTS meeting_url TEXT CHECK (meeting_url IS NULL OR char_length(meeting_url) <= 2048),
  ADD COLUMN IF NOT EXISTS venue TEXT CHECK (venue IS NULL OR char_length(btrim(venue)) BETWEEN 1 AND 200),
  ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER CHECK (reminder_minutes IS NULL OR reminder_minutes IN (0, 5, 10, 15, 30, 60, 1440, 10080)),
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS todos_reminder_due_idx
  ON todos (scheduled_for)
  WHERE scheduled_for IS NOT NULL AND reminder_minutes IS NOT NULL AND reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
