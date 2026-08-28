import type { NotificationEvent, NotificationStatus, Todo, TodoInput } from './types';

type ErrorEnvelope = { error?: { message?: string } };

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try { response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...init?.headers }, ...init }); }
  catch { throw new Error('We could not reach Daylist. Check your connection and try again.'); }
  if (response.ok) return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
  const problem = await response.json().catch((): ErrorEnvelope => ({}));
  throw new Error(problem.error?.message ?? 'That action could not be completed. Please try again.');
};

export const todoApi = {
  list: () => request<Todo[]>('/api/todos'),
  create: (input: TodoInput) => request<Todo>('/api/todos', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: Partial<TodoInput> & { isDone?: boolean }) => request<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/api/todos/${id}`, { method: 'DELETE' })
};

export const notificationApi = {
  status: () => request<NotificationStatus>('/api/notifications/status'),
  list: () => request<NotificationEvent[]>('/api/notifications'),
  markAllRead: () => request<void>('/api/notifications/read', { method: 'PATCH' }),
  subscribe: (subscription: PushSubscriptionJSON) => request<{ status: string }>('/api/notifications/subscription', { method: 'POST', body: JSON.stringify(subscription) }),
  unsubscribe: (endpoint: string) => request<void>('/api/notifications/subscription', { method: 'DELETE', body: JSON.stringify({ endpoint }) })
};
