import type { Pool } from 'pg';
import webpush from 'web-push';
import type { PushSubscriptionPayload } from './db/notifications.js';

export type PushConfig = { publicKey: string; privateKey: string; subject: string } | null;
export const getPushConfig = (): PushConfig => {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
};

type DueTodo = { id: string; title: string; scheduled_for: Date; venue: string | null; meeting_url: string | null };
export const startReminderDispatcher = (pool: Pool, config: PushConfig) => {
  if (!config) return () => undefined;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const dispatch = async () => {
    const [due, subscriptions] = await Promise.all([
      pool.query<DueTodo>(`SELECT id, title, scheduled_for, venue, meeting_url FROM todos WHERE scheduled_for IS NOT NULL AND reminder_minutes IS NOT NULL AND reminder_sent_at IS NULL AND scheduled_for >= NOW() AND scheduled_for - (reminder_minutes * INTERVAL '1 minute') <= NOW()`),
      pool.query<{ endpoint: string; subscription: PushSubscriptionPayload }>('SELECT endpoint, subscription FROM push_subscriptions')
    ]);
    if (subscriptions.rowCount === 0) return;
    for (const todo of due.rows) {
      let delivered = false;
      const body = `Scheduled for ${todo.scheduled_for.toLocaleString()}${todo.venue ? ` · ${todo.venue}` : ''}`;
      await Promise.all(subscriptions.rows.map(async ({ endpoint, subscription }) => {
        try { await webpush.sendNotification(subscription, JSON.stringify({ title: todo.title, body, url: todo.meeting_url ?? '/' })); delivered = true; }
        catch (cause: unknown) { if (typeof cause === 'object' && cause !== null && 'statusCode' in cause && ((cause as { statusCode?: number }).statusCode === 404 || (cause as { statusCode?: number }).statusCode === 410)) await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]); }
      }));
      if (delivered) {
        await Promise.all([
          pool.query('UPDATE todos SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1', [todo.id]),
          pool.query('INSERT INTO notification_events (todo_id, title, body, sent_at, read_at) VALUES ($1, $2, $3, NOW(), NULL) ON CONFLICT (todo_id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, sent_at = EXCLUDED.sent_at, read_at = NULL', [todo.id, todo.title, body])
        ]);
      }
    }
  };
  const timer = setInterval(() => { void dispatch().catch(cause => console.error('Reminder dispatcher error', cause)); }, 15_000);
  timer.unref(); void dispatch().catch(cause => console.error('Reminder dispatcher error', cause));
  return () => clearInterval(timer);
};
