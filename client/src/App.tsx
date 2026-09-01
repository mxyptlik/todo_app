import { type FormEvent, useEffect, useState } from 'react';

type Todo = { id: number; title: string; is_done: boolean };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const loadTodos = async () => {
    const response = await fetch('/api/todos');
    setTodos(await response.json());
  };
  useEffect(() => {
    void loadTodos();
    void fetch('/api/health').then((response) => response.json()).then((data: { version: string }) => setVersion(data.version));
  }, []);
  const addTodo = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await fetch('/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    setTitle('');
    await loadTodos();
  };
  const toggleTodo = async (id: number) => { await fetch(`/api/todos/${id}`, { method: 'PATCH' }); await loadTodos(); };
  const deleteTodo = async (id: number) => { await fetch(`/api/todos/${id}`, { method: 'DELETE' }); await loadTodos(); };
  return <div className="app"><h1>My To-Do List <span className="version">{version}</span></h1><form onSubmit={addTodo}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing?" aria-label="New todo" /><button type="submit">Add</button></form><ul>{todos.map((todo) => <li key={todo.id}><input type="checkbox" checked={todo.is_done} onChange={() => void toggleTodo(todo.id)} aria-label={`Toggle ${todo.title}`} /><span className={todo.is_done ? 'done' : ''}>{todo.title}</span><button type="button" onClick={() => void deleteTodo(todo.id)}>Delete</button></li>)}</ul>{todos.length === 0 && <p>Nothing here yet. Add your first to-do.</p>}</div>;
}
