import type { Pool } from 'pg';

export type PushSubscriptionPayload = { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } };
export type NotificationEvent = { id: number; todoId: number; title: string; body: string; sentAt: string; readAt: string | null };

export interface NotificationRepository {
  count(): Promise<number>;
  unreadCount(): Promise<number>;
  list(): Promise<NotificationEvent[]>;
  markAllRead(): Promise<void>;
  save(subscription: PushSubscriptionPayload): Promise<void>;
  remove(endpoint: string): Promise<void>;
}

export const createNotificationRepository = (pool: Pool): NotificationRepository => ({
  async count() { const result = await pool.query<{ count: string }>('SELECT count(*) FROM push_subscriptions'); return Number(result.rows[0].count); },
  async unreadCount() { const result = await pool.query<{ count: string }>('SELECT count(*) FROM notification_events WHERE read_at IS NULL'); return Number(result.rows[0].count); },
  async list() {
    const result = await pool.query<{ id: string; todo_id: string; title: string; body: string; sent_at: Date; read_at: Date | null }>('SELECT id, todo_id, title, body, sent_at, read_at FROM notification_events ORDER BY sent_at DESC LIMIT 50');
    return result.rows.map(row => ({ id: Number(row.id), todoId: Number(row.todo_id), title: row.title, body: row.body, sentAt: row.sent_at.toISOString(), readAt: row.read_at?.toISOString() ?? null }));
  },
  async markAllRead() { await pool.query('UPDATE notification_events SET read_at = NOW() WHERE read_at IS NULL'); },
  async save(subscription) { await pool.query(`INSERT INTO push_subscriptions (endpoint, subscription, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (endpoint) DO UPDATE SET subscription = EXCLUDED.subscription, updated_at = NOW()`, [subscription.endpoint, JSON.stringify(subscription)]); },
  async remove(endpoint) { await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]); }
});
