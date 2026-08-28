import 'dotenv/config';
import path from 'node:path';
import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { createNotificationRepository } from './db/notifications.js';
import { createTodoRepository } from './db/todos.js';
import { getPushConfig, startReminderDispatcher } from './notifications.js';

const port = Number(process.env.PORT ?? 4000);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const pool = createPool(databaseUrl);
const pushConfig = getPushConfig();
const stopDispatcher = startReminderDispatcher(pool, pushConfig);
const clientDist = path.resolve(process.cwd(), 'client', 'dist');
const server = createApp(createTodoRepository(pool), createNotificationRepository(pool), pushConfig, clientDist).listen(port, () => console.info(`Daylist listening on ${port}`));
const shutdown = () => { stopDispatcher(); server.close(() => pool.end().finally(() => process.exit(0))); };
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
