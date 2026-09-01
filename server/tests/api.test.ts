import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('lab todo API', () => {
  it('reports the version and keeps new todos first', async () => {
    const app = createApp('abc1234');
    await request(app).get('/api/health').expect(200, { status: 'ok', version: 'abc1234' });
    await request(app).post('/api/todos').send({ title: ' First ' }).expect(201);
    await request(app).post('/api/todos').send({ title: 'Second' }).expect(201);
    const response = await request(app).get('/api/todos').expect(200);
    expect(response.body.map((todo: { title: string }) => todo.title)).toEqual(['Second', 'First']);
  });
  it('validates, toggles, and deletes todos', async () => {
    const app = createApp();
    await request(app).post('/api/todos').send({ title: '  ' }).expect(400);
    const created = await request(app).post('/api/todos').send({ title: 'Read' }).expect(201);
    await request(app).patch(`/api/todos/${created.body.id}`).expect(200, { ...created.body, is_done: true });
    await request(app).delete(`/api/todos/${created.body.id}`).expect(204);
  });
});
