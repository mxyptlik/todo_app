import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import type { NotificationRepository } from './db/notifications.js';
import type { PushConfig } from './notifications.js';
import type { Todo, TodoInput, TodoRepository, TodoStatus, TodoUpdate } from './types.js';

const idSchema = z.coerce.number().int().positive();
const reminderSchema = z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30), z.literal(60), z.literal(1440), z.literal(10080)]).nullable();
const meetingUrlSchema = z.string().trim().url('Meeting link must be a valid URL.').max(2048).refine(value => /^https?:$/.test(new URL(value).protocol), 'Meeting link must use http or https.').nullable();
const scheduleSchema = z.object({
  scheduledFor: z.string().datetime({ offset: true, message: 'Date and time must include a timezone.' }).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(1440).optional(),
  meetingUrl: meetingUrlSchema.optional(),
  venue: z.string().trim().min(1, 'Venue cannot be empty.').max(200).nullable().optional(),
  reminderMinutes: reminderSchema.optional()
}).strict();
const titleSchema = scheduleSchema.extend({ title: z.string().trim().min(1, 'Title is required.').max(200, 'Title must be 200 characters or fewer.') });
const updateSchema = scheduleSchema.extend({ title: z.string().trim().min(1).max(200).optional(), isDone: z.boolean().optional() });
const statusSchema = z.enum(['all', 'active', 'completed']).default('all');
const subscriptionSchema = z.object({ endpoint: z.string().url().max(4096), expirationTime: z.number().nullable(), keys: z.object({ p256dh: z.string().min(1).max(1024), auth: z.string().min(1).max(1024) }).strict() }).strict();

const error = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const parseId = (req: Request, res: Response) => {
  const parsed = idSchema.safeParse(req.params.id);
  return parsed.success ? parsed.data : (error(res, 400, 'VALIDATION_ERROR', 'Todo id must be a positive integer.'), null);
};

const validateSchedule = (input: { scheduledFor?: string | null }) => {
  if (input.scheduledFor && new Date(input.scheduledFor).getTime() <= Date.now()) return 'Scheduled time must be in the future.';
  return null;
};
const icsEscape = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const calendarFile = (todo: Todo) => {
  if (!todo.scheduledFor) return null;
  const start = new Date(todo.scheduledFor); const end = new Date(start.getTime() + todo.durationMinutes * 60_000);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Daylist//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:daylist-${todo.id}@local`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsEscape(todo.title)}`, todo.venue ? `LOCATION:${icsEscape(todo.venue)}` : '', todo.meetingUrl ? `URL:${icsEscape(todo.meetingUrl)}` : '', 'END:VEVENT', 'END:VCALENDAR'];
  return `${lines.filter(Boolean).join('\r\n')}\r\n`;
};

export const createApp = (todos: TodoRepository, notifications?: NotificationRepository, pushConfig: PushConfig = null, clientDist?: string) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(morgan('tiny'));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/todos', async (req, res, next) => {
    const parsed = statusSchema.safeParse(req.query.status);
    if (!parsed.success) return error(res, 400, 'VALIDATION_ERROR', 'Status must be all, active, or completed.');
    try { return res.json(await todos.list(parsed.data as TodoStatus)); } catch (cause) { return next(cause); }
  });
  app.post('/api/todos', async (req, res, next) => {
    const parsed = titleSchema.safeParse(req.body);
    if (!parsed.success) return error(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
    const scheduleError = validateSchedule(parsed.data); if (scheduleError) return error(res, 400, 'VALIDATION_ERROR', scheduleError);
    if (parsed.data.reminderMinutes !== null && parsed.data.reminderMinutes !== undefined && !parsed.data.scheduledFor) return error(res, 400, 'VALIDATION_ERROR', 'Choose a date and time before setting a reminder.');
    try { return res.status(201).json(await todos.create(parsed.data as TodoInput)); } catch (cause) { return next(cause); }
  });
  app.patch('/api/todos/:id', async (req, res, next) => {
    const id = parseId(req, res); if (id === null) return;
    const isLegacyToggle = req.body === undefined || (typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length === 0);
    const parsed = isLegacyToggle ? null : updateSchema.safeParse(req.body);
    if (parsed && !parsed.success) return error(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
    if (parsed && Object.keys(parsed.data).length === 0) return error(res, 400, 'VALIDATION_ERROR', 'Provide a change or send an empty body to toggle completion.');
    if (parsed) { const scheduleError = validateSchedule(parsed.data); if (scheduleError) return error(res, 400, 'VALIDATION_ERROR', scheduleError); }
    try {
      const todo = isLegacyToggle
        ? await todos.toggle(id)
        : await todos.update(id, (parsed as z.SafeParseSuccess<TodoUpdate>).data);
      return todo ? res.json(todo) : error(res, 404, 'NOT_FOUND', 'Todo not found.');
    } catch (cause) { return next(cause); }
  });
  app.delete('/api/todos/:id', async (req, res, next) => {
    const id = parseId(req, res); if (id === null) return;
    try { return (await todos.delete(id)) ? res.status(204).send() : error(res, 404, 'NOT_FOUND', 'Todo not found.'); } catch (cause) { return next(cause); }
  });
  app.get('/api/todos/:id/calendar', async (req, res, next) => {
    const id = parseId(req, res); if (id === null) return;
    try {
      const todo = await todos.get(id); if (!todo) return error(res, 404, 'NOT_FOUND', 'Todo not found.');
      const file = calendarFile(todo); if (!file) return error(res, 409, 'NOT_SCHEDULED', 'Add a date and time before exporting this item.');
      res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="daylist-${todo.id}.ics"`, 'Cache-Control': 'no-store' });
      return res.send(file);
    } catch (cause) { return next(cause); }
  });
  app.get('/api/notifications/status', async (_req, res, next) => {
    try { return res.json({ configured: Boolean(pushConfig), publicKey: pushConfig?.publicKey ?? null, subscriptions: notifications ? await notifications.count() : 0, unreadCount: notifications ? await notifications.unreadCount() : 0 }); } catch (cause) { return next(cause); }
  });
  app.get('/api/notifications', async (_req, res, next) => {
    try { return res.json(notifications ? await notifications.list() : []); } catch (cause) { return next(cause); }
  });
  app.patch('/api/notifications/read', async (_req, res, next) => {
    if (!notifications) return res.status(204).send();
    try { await notifications.markAllRead(); return res.status(204).send(); } catch (cause) { return next(cause); }
  });
  app.post('/api/notifications/subscription', async (req, res, next) => {
    const parsed = subscriptionSchema.safeParse(req.body); if (!parsed.success) return error(res, 400, 'VALIDATION_ERROR', 'A valid push subscription is required.');
    if (!notifications || !pushConfig) return error(res, 503, 'PUSH_NOT_CONFIGURED', 'Push notifications are not configured on this server.');
    try { await notifications.save(parsed.data); return res.status(201).json({ status: 'subscribed' }); } catch (cause) { return next(cause); }
  });
  app.delete('/api/notifications/subscription', async (req, res, next) => {
    const endpoint = z.object({ endpoint: z.string().url().max(4096) }).safeParse(req.body); if (!endpoint.success) return error(res, 400, 'VALIDATION_ERROR', 'A subscription endpoint is required.');
    if (!notifications) return res.status(204).send();
    try { await notifications.remove(endpoint.data.endpoint); return res.status(204).send(); } catch (cause) { return next(cause); }
  });
  if (clientDist && existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => res.sendFile('index.html', { root: clientDist }));
  }
  app.use((_req, res) => error(res, 404, 'NOT_FOUND', 'Route not found.'));
  app.use((cause: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    void _next;
    console.error('Unhandled request error', cause);
    if (cause instanceof SyntaxError) return error(res, 400, 'MALFORMED_JSON', 'Request body must be valid JSON.');
    return error(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  });
  return app;
};
