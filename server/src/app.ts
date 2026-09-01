import express from 'express';
import path from 'node:path';

type Todo = { id: number; title: string; is_done: boolean };

export const createApp = (version = process.env.APP_VERSION ?? 'v1') => {
  const app = express();
  let todos: Todo[] = [];
  let nextId = 1;

  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version }));
  app.get('/api/todos', (_req, res) => res.json([...todos].reverse()));
  app.post('/api/todos', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const todo: Todo = { id: nextId++, title, is_done: false };
    todos.push(todo);
    return res.status(201).json(todo);
  });
  app.patch('/api/todos/:id', (req, res) => {
    const todo = todos.find((item) => item.id === Number(req.params.id));
    if (!todo) return res.status(404).json({ error: 'Not found' });
    todo.is_done = !todo.is_done;
    return res.json(todo);
  });
  app.delete('/api/todos/:id', (req, res) => {
    const before = todos.length;
    todos = todos.filter((item) => item.id !== Number(req.params.id));
    if (todos.length === before) return res.status(404).json({ error: 'Not found' });
    return res.status(204).end();
  });

  const clientDir = path.join(process.cwd(), 'client', 'dist');
  app.use(express.static(clientDir));
  app.use((_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  return app;
};
