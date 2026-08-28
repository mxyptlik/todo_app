import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NotificationRepository } from '../src/db/notifications.js';
import type { Todo, TodoInput, TodoRepository, TodoStatus, TodoUpdate } from '../src/types.js';

const repo = (): TodoRepository => {
  let next = 1; const values: Todo[] = []; const now = () => new Date().toISOString();
  const createValue = (input: TodoInput): Todo => ({ id: next++, title: input.title, isDone: false, scheduledFor: input.scheduledFor ?? null, durationMinutes: input.durationMinutes ?? 30, meetingUrl: input.meetingUrl ?? null, venue: input.venue ?? null, reminderMinutes: input.reminderMinutes ?? null, createdAt: now(), updatedAt: now() });
  return {
    async list(status: TodoStatus) { return values.filter(todo => status === 'all' || (status === 'active' ? !todo.isDone : todo.isDone)).sort((a, b) => b.id - a.id); },
    async get(id) { return values.find(todo => todo.id === id) ?? null; },
    async create(input) { const value = createValue(input); values.push(value); return value; },
    async update(id, input: TodoUpdate) { const value = values.find(todo => todo.id === id); if (!value) return null; Object.assign(value, input, { updatedAt: now() }); return value; },
    async toggle(id) { const value = values.find(todo => todo.id === id); if (!value) return null; value.isDone = !value.isDone; value.updatedAt = now(); return value; },
    async delete(id) { const index = values.findIndex(todo => todo.id === id); if (index < 0) return false; values.splice(index, 1); return true; }
  };
};

const notificationRepo = (): NotificationRepository => {
  let isRead = false;
  return {
    async count() { return 1; },
    async unreadCount() { return isRead ? 0 : 1; },
    async list() { return [{ id: 1, todoId: 1, title: 'Design review', body: 'Scheduled for tomorrow', sentAt: '2026-08-28T10:00:00.000Z', readAt: isRead ? '2026-08-28T10:01:00.000Z' : null }]; },
    async markAllRead() { isRead = true; },
    async save() {},
    async remove() {}
  };
};

describe('Todo API', () => {
  it('serves health, creates trimmed tasks, and lists newest first', async () => { const app = createApp(repo()); await request(app).get('/api/health').expect(200, { status: 'ok' }); await request(app).post('/api/todos').send({ title: ' First ' }).expect(201); const second = await request(app).post('/api/todos').send({ title: 'Second' }).expect(201); const list = await request(app).get('/api/todos').expect(200); expect(list.body.map((todo: Todo) => todo.title)).toEqual(['Second', 'First']); expect(second.body.title).toBe('Second'); });
  it('validates title, ids, toggles explicitly and supports empty-body legacy toggling', async () => { const app = createApp(repo()); await request(app).post('/api/todos').send({ title: '  ' }).expect(400).expect(({ body }) => expect(body.error.code).toBe('VALIDATION_ERROR')); const created = await request(app).post('/api/todos').send({ title: 'Read' }).expect(201); await request(app).patch(`/api/todos/${created.body.id}`).send({ isDone: true }).expect(200).expect(({ body }) => expect(body.isDone).toBe(true)); await request(app).patch(`/api/todos/${created.body.id}`).send({}).expect(200).expect(({ body }) => expect(body.isDone).toBe(false)); await request(app).patch('/api/todos/nope').send({ isDone: true }).expect(400); await request(app).patch('/api/todos/999').send({ isDone: true }).expect(404); });
  it('creates scheduled items, rejects past reminders, and exports valid calendar data', async () => { const app = createApp(repo()); const future = new Date(Date.now() + 3_600_000).toISOString(); const created = await request(app).post('/api/todos').send({ title: 'Design review', scheduledFor: future, durationMinutes: 45, venue: 'Studio 4', reminderMinutes: 15 }).expect(201); expect(created.body).toMatchObject({ scheduledFor: future, durationMinutes: 45, venue: 'Studio 4', reminderMinutes: 15 }); const calendar = await request(app).get(`/api/todos/${created.body.id}/calendar`).expect(200); expect(calendar.headers['content-type']).toContain('text/calendar'); expect(calendar.text).toContain('SUMMARY:Design review'); await request(app).post('/api/todos').send({ title: 'Past', scheduledFor: new Date(Date.now() - 60_000).toISOString(), reminderMinutes: 5 }).expect(400); await request(app).post('/api/todos').send({ title: 'No schedule', reminderMinutes: 5 }).expect(400); });
  it('deletes todos and returns missing errors', async () => { const app = createApp(repo()); const created = await request(app).post('/api/todos').send({ title: 'Remove' }); await request(app).delete(`/api/todos/${created.body.id}`).expect(204); await request(app).delete(`/api/todos/${created.body.id}`).expect(404); });
  it('lists unread notification events and marks them read', async () => { const app = createApp(repo(), notificationRepo(), { publicKey: 'public', privateKey: 'private', subject: 'mailto:test@example.com' }); await request(app).get('/api/notifications/status').expect(200).expect(({ body }) => expect(body).toMatchObject({ configured: true, subscriptions: 1, unreadCount: 1 })); await request(app).get('/api/notifications').expect(200).expect(({ body }) => expect(body[0]).toMatchObject({ title: 'Design review', readAt: null })); await request(app).patch('/api/notifications/read').expect(204); await request(app).get('/api/notifications/status').expect(200).expect(({ body }) => expect(body.unreadCount).toBe(0)); });
});
