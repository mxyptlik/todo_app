import 'dotenv/config';
import { createPool } from './pool.js';

if (process.env.NODE_ENV === 'production') throw new Error('Seeding is disabled in production.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = createPool(process.env.DATABASE_URL);
try { await pool.query('INSERT INTO todos (title, is_done) VALUES ($1, $2), ($3, $4), ($5, $6)', ['Prepare the project brief', false, 'Reply to the design review', true, 'Book a focused work block', false]); console.info('Development tasks added.'); } finally { await pool.end(); }
