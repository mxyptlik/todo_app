import type { Pool } from 'pg';
import type { Todo, TodoInput, TodoRepository, TodoStatus, TodoUpdate } from '../types.js';

type TodoRow = { id: string; title: string; is_done: boolean; scheduled_for: Date | null; duration_minutes: number; meeting_url: string | null; venue: string | null; reminder_minutes: number | null; created_at: Date; updated_at: Date };

const columns = 'id, title, is_done, scheduled_for, duration_minutes, meeting_url, venue, reminder_minutes, created_at, updated_at';
const toTodo = (row: TodoRow): Todo => ({
  id: Number(row.id), title: row.title, isDone: row.is_done,
  scheduledFor: row.scheduled_for?.toISOString() ?? null, durationMinutes: row.duration_minutes,
  meetingUrl: row.meeting_url, venue: row.venue, reminderMinutes: row.reminder_minutes,
  createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
});

export const createTodoRepository = (pool: Pool): TodoRepository => ({
  async list(status) {
    const predicate: Record<TodoStatus, string> = { all: '', active: ' WHERE is_done = FALSE', completed: ' WHERE is_done = TRUE' };
    const result = await pool.query<TodoRow>(`SELECT ${columns} FROM todos${predicate[status]} ORDER BY created_at DESC, id DESC`);
    return result.rows.map(toTodo);
  },
  async get(id) {
    const result = await pool.query<TodoRow>(`SELECT ${columns} FROM todos WHERE id = $1`, [id]);
    return result.rows[0] ? toTodo(result.rows[0]) : null;
  },
  async create(input: TodoInput) {
    const result = await pool.query<TodoRow>(`INSERT INTO todos (title, scheduled_for, duration_minutes, meeting_url, venue, reminder_minutes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${columns}`,
      [input.title, input.scheduledFor ?? null, input.durationMinutes ?? 30, input.meetingUrl ?? null, input.venue ?? null, input.reminderMinutes ?? null]);
    return toTodo(result.rows[0]);
  },
  async update(id, input: TodoUpdate) {
    const fields: Array<[string, unknown]> = [];
    if (input.title !== undefined) fields.push(['title', input.title]);
    if (input.isDone !== undefined) fields.push(['is_done', input.isDone]);
    if (input.scheduledFor !== undefined) fields.push(['scheduled_for', input.scheduledFor]);
    if (input.durationMinutes !== undefined) fields.push(['duration_minutes', input.durationMinutes]);
    if (input.meetingUrl !== undefined) fields.push(['meeting_url', input.meetingUrl]);
    if (input.venue !== undefined) fields.push(['venue', input.venue]);
    if (input.reminderMinutes !== undefined) fields.push(['reminder_minutes', input.reminderMinutes]);
    if (input.scheduledFor !== undefined || input.reminderMinutes !== undefined) fields.push(['reminder_sent_at', null]);
    if (fields.length === 0) return null;
    const assignments = fields.map(([column], index) => `${column} = $${index + 1}`).join(', ');
    const result = await pool.query<TodoRow>(`UPDATE todos SET ${assignments}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING ${columns}`, [...fields.map(([, value]) => value), id]);
    return result.rows[0] ? toTodo(result.rows[0]) : null;
  },
  async toggle(id) {
    const result = await pool.query<TodoRow>(`UPDATE todos SET is_done = NOT is_done, updated_at = NOW() WHERE id = $1 RETURNING ${columns}`, [id]);
    return result.rows[0] ? toTodo(result.rows[0]) : null;
  },
  async delete(id) {
    const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    return result.rowCount === 1;
  }
});
